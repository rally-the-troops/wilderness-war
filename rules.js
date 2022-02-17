"use strict";

// RULES
// does defender win assault if attacker is eliminated?
// France/Britain or "The French"/"The British"

// CLEANUPS
// TODO: rename node/space -> location/space or raw_space/space or box/space?
// TODO: replace piece[p].type lookups with index range checks
// TODO: move core of is_friendly/enemy to is_british/french and branch in is_friendly/enemy
// TODO: make 'inside' negative location instead of separate array
// TODO: abbreviate per-player (game.British.xxx) property name (game.b.xxx)
// TODO: add/remove 'next' steps at end of states
// TODO: manual selection of reduced/placed units in events
// TODO: show british leader pool
// TODO: show badge on leader boxes if they're eliminated or in pool
// TODO: show discard/removed card list in UI
// TODO: for_each_exit -> flat list of all exits

// MINOR
// TODO: select leader for defense instead of automatically picking
// TODO: remove old 7 command leader(s) immediately as they're drawn, before placing reinforcements

// FEATURES
// TODO: infiltration
//	infiltrator must retreat after battle of fort/fortress space (per 6.712)
//		may not stop on fort/fortress (6.52 overrides rule 6.64)
//		defenders may not retreat inside
// STEP 1 - only check if 1 MP left (instead of searching) rather than enough MP to reach non-infiltration
// STEP 2 - find closest path to non-infiltration space

// BUGS
// TODO: 13.12 victory check exception -- originally-British fortresses are friendly
// TODO: 10.413 leaders and coureurs may follow indians home
// TODO: leaders alone - retreat from reinforcement placements

const { spaces, pieces, cards } = require("./data");

const BRITAIN = 'Britain';
const FRANCE = 'France';

// Order of pieces: br.leaders/br.units/fr.leaders/fr.units
let first_british_piece = -1;
let last_british_leader = -1;
let last_british_piece = -1;
let first_french_piece = -1;
let last_french_leader = -1;
let last_french_piece = -1;

let british_militia_units = [];
let french_militia_units = [];

// Create card event names.
for (let c = 1; c < cards.length; ++c) {
	cards[c].event = cards[c].name
		.replace(/&/g, "and")
		.replace(/!/g, "")
		.replace(/ /g, "_")
		.toLowerCase();
}

// Figure out piece indices.
for (let p = 1; p < pieces.length; ++p) {
	if (pieces[p].faction === 'british') {
		if (pieces[p].type === 'militias')
			british_militia_units.push(p);
		if (first_british_piece < 0)
			first_british_piece = p;
		if (pieces[p].type === 'leader')
			last_british_leader = p;
		last_british_piece = p;
	} else {
		if (pieces[p].type === 'militias')
			french_militia_units.push(p);
		if (first_french_piece < 0)
			first_french_piece = p;
		if (pieces[p].type === 'leader')
			last_french_leader = p;
		last_french_piece = p;
	}
}

let first_british_unit = last_british_leader;
let last_british_unit = last_british_piece;
let first_french_unit = last_french_leader;
let last_french_unit = last_french_piece;

// Patch up leader/box associations.
for (let s = 1; s < spaces.length; ++s) {
	if (spaces[s].type === 'leader-box') {
		let p = find_leader(spaces[s].name);
		spaces[s].leader = p;
		pieces[p].box = s;
	}
}

let game;
let view = null;
let states = {};
let events = {};

let player; // aliased to game[friendly()] per-player state
let enemy_player; // aliased to game[enemy()] per-player state
let supply_cache; // cleared when setting active player and loading game state

// These looping indices are updated with update_active_aliases()
let first_enemy_leader;
let first_enemy_piece;
let first_enemy_unit;
let first_friendly_leader;
let first_friendly_piece;
let first_friendly_unit;
let last_enemy_leader;
let last_enemy_piece;
let last_enemy_unit;
let last_friendly_leader;
let last_friendly_piece;
let last_friendly_unit;

function random(n) {
	return ((game.seed = game.seed * 69621 % 0x7fffffff) / 0x7fffffff) * n | 0;
}

function roll_die(reason) {
	let die = random(6) + 1;
	if (reason)
		log(`Roll ${die} ${reason}.`);
	else
		log(`Roll ${die}.`);
	return die;
}

function modify(die, drm, why) {
	if (drm >= 0)
		log(`+${drm} ${why}.`);
	else if (drm < 0)
		log(`${drm} ${why}.`);
	return die + drm;
}

function clamp(x, min, max) {
	return Math.min(Math.max(x, min), max);
}

function remove_from_array(array, item) {
	let i = array.indexOf(item);
	if (i >= 0)
		array.splice(i, 1);
}

function log(...args) {
	let s = Array.from(args).join(" ");
	console.log("LOG", s);
	game.log.push(s);
}

function friendly() {
	return game.active;
}

function enemy() {
	return game.active === FRANCE ? BRITAIN : FRANCE;
}

function set_enemy_active(new_state) {
	game.state = new_state;
	set_active(enemy());
}

function set_active(new_active) {
	game.active = new_active;
	update_active_aliases();
}

function update_active_aliases() {
	supply_cache = null;
	player = game[friendly()];
	enemy_player = game[enemy()];
	if (game.active === BRITAIN) {
		first_enemy_piece = first_french_piece;
		last_enemy_leader = last_french_leader;
		last_enemy_piece = last_french_piece;
		first_friendly_piece = first_british_piece;
		last_friendly_leader = last_british_leader;
		last_friendly_piece = last_british_piece;
	} else {
		first_enemy_piece = first_british_piece;
		last_enemy_leader = last_british_leader;
		last_enemy_piece = last_british_piece;
		first_friendly_piece = first_french_piece;
		last_friendly_leader = last_french_leader;
		last_friendly_piece = last_french_piece;
	}
	first_enemy_leader = first_enemy_piece;
	first_friendly_leader = first_friendly_piece;
	first_enemy_unit = last_enemy_leader + 1;
	first_friendly_unit = last_friendly_leader + 1;
	last_enemy_unit = last_enemy_piece;
	last_friendly_unit = last_friendly_piece;
}

// LISTS

const EARLY = 0;
const LATE = 1;

const RELUCTANT = 0;
const SUPPORTIVE = 1;
const ENTHUSIASTIC = 2;

function find_space(name) {
	if (name === 'eliminated')
		return 0;
	let ix = spaces.findIndex(node => node.name === name);
	if (ix < 0)
		throw new Error("cannot find space " + name);
	return ix;
}

function find_leader(name) {
	let ix = pieces.findIndex(piece => piece.name === name);
	if (ix < 0)
		throw new Error("cannot find leader " + name);
	return ix;
}

function find_unused_unit(name) {
	for (let i = 0; i < pieces.length; ++i)
		if (pieces[i].name === name && game.pieces.location[i] === 0)
			return i;
	throw new Error("cannot find unit " + name);
}

const ports = [
	"Alexandria",
	"Baltimore",
	"Boston",
	"Halifax",
	"Louisbourg",
	"New Haven",
	"New York",
	"Philadelphia",
	"Québec",
].map(name => spaces.findIndex(space => space.name === name));

const french_ports = [
	"Louisbourg",
	"Québec",
].map(name => spaces.findIndex(space => space.name === name));

const fortresses = [
	"Albany",
	"Alexandria",
	"Baltimore",
	"Boston",
	"Halifax",
	"Louisbourg",
	"Montréal",
	"New Haven",
	"New York",
	"Philadelphia",
	"Québec",
].map(name => spaces.findIndex(space => space.name === name));

const originally_french_fortresses = [
	"Louisbourg",
	"Montréal",
	"Québec",
].map(name => spaces.findIndex(space => space.name === name));

const originally_british_fortresses = [
	"Albany",
	"Alexandria",
	"Baltimore",
	"Boston",
	"Halifax",
	"New Haven",
	"New York",
	"Philadelphia",
].map(name => spaces.findIndex(space => space.name === name));

const originally_british_fortresses_and_ports = [
	"Albany",
	"Alexandria",
	"Baltimore",
	"Boston",
	"Halifax",
	"Louisbourg",
	"New Haven",
	"New York",
	"Philadelphia",
	"Québec",
].map(name => spaces.findIndex(space => space.name === name));


const departments = {
	st_lawrence: [
		"Baie-St-Paul",
		"Bécancour",
		"Kahnawake",
		"Lac des Deux Montagnes",
		"Montréal",
		"Québec",
		"Rivière-Ouelle",
		"Sorel",
		"St-François",
		"St-Jean",
		"Trois-Rivières",
		"Île d'Orléans",
	].map(name => spaces.findIndex(space => space.name === name)),
	northern: [
		"Albany",
		"Boston",
		"Burlington",
		"Charlestown",
		"Concord",
		"Deerfield",
		"Gloucester",
		"Hartford",
		"Hoosic",
		"Kinderhook",
		"Manchester",
		"New Haven",
		"New York",
		"Northampton",
		"Peekskill",
		"Portsmouth",
		"Poughkeepsie",
		"Providence",
		"Schenectady",
		"Trenton",
		"Worcester",
	].map(name => spaces.findIndex(space => space.name === name)),
	southern: [
		"Alexandria",
		"Ashby's Gap",
		"Augusta",
		"Baltimore",
		"Carlisle",
		"Culpeper",
		"Easton",
		"Frederick",
		"Harris's Ferry",
		"Head of Elk",
		"Lancaster",
		"New Castle",
		"Philadelphia",
		"Reading",
		"Shepherd's Ferry",
		"Winchester",
		"Woodstock",
		"Wright's Ferry",
		"York",
	].map(name => spaces.findIndex(space => space.name === name)),
}

const indian_spaces = {
	"pays-d-en-haut": [
		find_space("Pays d'en Haut")
	],
	northern: [
		"Kahnawake",
		"Lac des Deux Montagnes",
		"Mississauga",
		"St-François",
	].map(name => spaces.findIndex(space => space.name === name)),
	western: [
		"Kittaning",
		"Logstown",
		"Mingo Town",
	].map(name => spaces.findIndex(space => space.name === name)),
	mohawks: [
		"Canajoharie",
	].map(name => spaces.findIndex(space => space.name === name)),
	iroquois: [
		"Cayuga",
		"Karaghiyadirha",
		"Oneida Castle",
		"Onondaga",
		"Shawiangto",
	].map(name => spaces.findIndex(space => space.name === name)),
}

const indian_tribe = {};

function define_indian_settlement(space_name, tribe) {
	let space = find_space(space_name);
	if (space_name !== "Pays d'en Haut")
		indian_tribe[space] = tribe;
	for (let p = 1; p < pieces.length; ++p)
		if (pieces[p].name === tribe)
			pieces[p].settlement = space;
}

define_indian_settlement("Kahnawake", "Caughnawaga");
define_indian_settlement("Lac des Deux Montagnes", "Algonquin");
define_indian_settlement("Mississauga", "Mississauga");
define_indian_settlement("St-François", "Abenaki");

define_indian_settlement("Mingo Town", "Mingo");
define_indian_settlement("Logstown", "Shawnee");
define_indian_settlement("Kittaning", "Delaware");

define_indian_settlement("Canajoharie", "Mohawk");

define_indian_settlement("Cayuga", "Cayuga");
define_indian_settlement("Karaghiyadirha", "Seneca");
define_indian_settlement("Oneida Castle", "Oneida");
define_indian_settlement("Onondaga", "Onondaga");
define_indian_settlement("Shawiangto", "Tuscarora");

define_indian_settlement("Pays d'en Haut", "Ojibwa");
define_indian_settlement("Pays d'en Haut", "Ottawa");
define_indian_settlement("Pays d'en Haut", "Potawatomi");
define_indian_settlement("Pays d'en Haut", "Huron");

const JOHNSON = find_leader("Johnson");
const ABERCROMBY = find_leader("Abercromby");
const AMHERST = find_leader("Amherst");
const FORBES = find_leader("Forbes");
const WOLFE = find_leader("Wolfe");
const BRADDOCK = find_leader("Braddock");
const LOUDOUN = find_leader("Loudoun");
const MONTCALM = find_leader("Montcalm");
const LEVIS = find_leader("Lévis");
const BOUGAINVILLE = find_leader("Bougainville");
const SHIRLEY = find_leader("Shirley");

const HALIFAX = find_space("Halifax");
const LOUISBOURG = find_space("Louisbourg");
const BAIE_ST_PAUL = find_space("Baie-St-Paul");
const RIVIERE_OUELLE = find_space("Rivière-Ouelle");
const ILE_D_ORLEANS = find_space("Île d'Orléans");
const QUEBEC = find_space("Québec");
const MONTREAL = find_space("Montréal");
const OHIO_FORKS = find_space("Ohio Forks");
const CANAJOHARIE = find_space("Canajoharie");
const NIAGARA = find_space("Niagara");
const OSWEGO = find_space("Oswego");
const ONEIDA_CARRY_WEST = find_space("Oneida Carry West");
const ONEIDA_CARRY_EAST = find_space("Oneida Carry East");
const PAYS_D_EN_HAUT = find_space("Pays d'en Haut");

const ST_LAWRENCE_CANADIAN_MILITIAS = find_space("St. Lawrence Canadian Militias");
const NORTHERN_COLONIAL_MILITIAS = find_space("Northern Colonial Militias");
const SOUTHERN_COLONIAL_MILITIAS = find_space("Southern Colonial Militias");

const SURRENDER = 6;
const MASSACRE = 7;
const COEHORNS = 8;
const FIELDWORKS_1 = 9;
const FIELDWORKS_2 = 10;
const AMBUSH_1 = 11;
const AMBUSH_2 = 12;
const BLOCKHOUSES = 13;
const FOUL_WEATHER = 14;
const LAKE_SCHOONER = 15;
const GEORGE_CROGHAN = 16;
const first_amphib_card = 17;
const last_amphib_card = 20;
const LOUISBOURG_SQUADRONS = 21;

const within_two_of_canajoharie = [ CANAJOHARIE ];
for_each_exit(CANAJOHARIE, one => {
	if (!within_two_of_canajoharie.includes(one)) {
		within_two_of_canajoharie.push(one);
		for_each_exit(one, two => {
			if (!within_two_of_canajoharie.includes(two)) {
				within_two_of_canajoharie.push(two);
			}
		});
	}
});

const within_two_of_gray_settlement = [];
indian_spaces.iroquois.forEach(zero => {
	within_two_of_gray_settlement.push(zero);
});
indian_spaces.iroquois.forEach(zero => {
	for_each_exit(zero, one => {
		if (!within_two_of_gray_settlement.includes(one)) {
			within_two_of_gray_settlement.push(one);
			for_each_exit(one, two => {
				if (!within_two_of_gray_settlement.includes(two)) {
					within_two_of_gray_settlement.push(two);
				}
			});
		}
	});
});

const in_or_adjacent_to_ohio_forks = [ OHIO_FORKS ];
for_each_exit(OHIO_FORKS, one => {
	in_or_adjacent_to_ohio_forks.push(one);
});

function has_amphibious_arrow(space) {
	return space === HALIFAX || space === LOUISBOURG;
}

// Map spaces except militia boxes and leader boxes.
const first_space = 1;
const last_space = NORTHERN_COLONIAL_MILITIAS-1;

const british_iroquois_or_mohawk_names = [
	"Seneca", "Cayuga", "Onondaga", "Tuscarora", "Oneida", "Mohawk"
];

const british_iroquois_or_mohawk_units = [];
for (let i = 0; i < pieces.length; ++i) {
	let piece = pieces[i];
	if (piece.faction === 'british' && piece.type === 'indians' && british_iroquois_or_mohawk_names.includes(piece.name))
		british_iroquois_or_mohawk_units.push(i);
}

const originally_friendly_spaces = {
	France: departments.st_lawrence.concat([LOUISBOURG]),
	Britain: departments.northern.concat(departments.southern).concat([HALIFAX]),
}

// CARD DECK

function reshuffle_deck() {
	game.log.push("The deck is reshuffled.");
	game.cards.draw_pile = game.draw_pile.concat(game.cards.discarded);
	game.cards.discarded = [];
}

function last_discard() {
	if (game.cards.discarded.length > 0)
		return game.cards.discarded[game.cards.discarded.length-1];
	return null;
}

function deal_card() {
	if (game.cards.draw_pile.length === 0)
		reshuffle_deck();
	let i = random(game.cards.draw_pile.length);
	let c = game.cards.draw_pile[i];
	game.cards.draw_pile.splice(i, 1);
	return c;
}

function deal_cards() {
	let fn = 8;
	if (game.events.diplo)
		fn = 9;
	if (game.events.quiberon)
		fn = 7;

	let bn = 8;
	if (game.events.pitt)
		bn = 9;

	fn = fn - game.France.hand.length;
	bn = bn - game.Britain.hand.length;

	log("Dealt " + fn + " cards to France.");
	log("Dealt " + bn + " cards to Britain.");

	while (fn > 0 || bn > 0) {
		if (fn > 0) {
			game.France.hand.push(deal_card());
			--fn;
		}
		if (bn > 0) {
			game.Britain.hand.push(deal_card());
			--bn;
		}
	}
}

function draw_leader_from_pool() {
	if (game.pieces.pool.length > 0) {
		let i = random(game.pieces.pool.length);
		let p = game.pieces.pool[i];

		// 5.55 If both on-map 7 leaders are besieged, return the third to the pool without substitution.
		if (is_seven_command_leader(p)) {
			let n = 0;
			if (is_piece_on_map(ABERCROMBY) && is_piece_inside(ABERCROMBY)) ++n;
			if (is_piece_on_map(AMHERST) && is_piece_inside(AMHERST)) ++n;
			if (is_piece_on_map(BRADDOCK) && is_piece_inside(BRADDOCK)) ++n;
			if (is_piece_on_map(LOUDOUN) && is_piece_inside(LOUDOUN)) ++n;
			if (n >= 2) {
				log(`${piece_name(p)} returned to pool.`);
				return 0;
			}
		}

		game.pieces.pool.splice(i, 1);
		move_piece_to(p, leader_box(p)); // TODO: yes/no show drawn leader here?
		return p;
	}
	return 0;
}

function is_card_available(c) {
	return !game.cards.discarded.includes(c) && !game.cards.removed.includes(c);
}

function is_enemy_card_available(c) {
	return enemy_player.hand.length > 0 && is_card_available(c);
}

function is_friendly_card_available(c) {
	return player.hand.length > 0 && is_card_available(c);
}

function is_card_available_for_attacker(c) {
	return game[game.battle.attacker].hand.length > 0 && is_card_available(c);
}

function is_card_available_for_defender(c) {
	return game[game.battle.defender].hand.length > 0 && is_card_available(c);
}

// ITERATORS

function for_each_siege(fn) {
	for (let sid in game.sieges)
		fn(sid|0, game.sieges[sid]);
}

function for_each_exit(s, fn) {
	let { land, river, lakeshore } = spaces[s];
	for (let i = 0; i < land.length; ++i)
		fn(land[i], 'land');
	for (let i = 0; i < river.length; ++i)
		fn(river[i], 'river');
	for (let i = 0; i < lakeshore.length; ++i)
		fn(lakeshore[i], 'lakeshore');
}

function for_each_friendly_piece_in_node(node, fn) {
	for (let p = first_friendly_piece; p <= last_friendly_piece; ++p) {
		if (is_piece_in_node(p, node))
			fn(p);
	}
}

function for_each_friendly_leader_in_node(node, fn) {
	for (let p = first_friendly_leader; p <= last_friendly_leader; ++p) {
		if (is_piece_in_node(p, node))
			fn(p);
	}
}

function for_each_friendly_unit_in_node(node, fn) {
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p) {
		if (is_piece_in_node(p, node))
			fn(p);
	}
}

function for_each_friendly_piece_in_space(space, fn) {
	for (let p = first_friendly_piece; p <= last_friendly_piece; ++p) {
		if (is_piece_in_space(p, space))
			fn(p);
	}
}

function for_each_friendly_leader_in_space(space, fn) {
	for (let p = first_friendly_leader; p <= last_friendly_leader; ++p) {
		if (is_piece_in_space(p, space))
			fn(p);
	}
}

function for_each_friendly_unit_in_space(space, fn) {
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p) {
		if (is_piece_in_space(p, space))
			fn(p);
	}
}

function for_each_unbesieged_enemy_in_space(space, fn) {
	for (let p = first_enemy_unit; p <= last_enemy_unit; ++p) {
		if (is_piece_unbesieged(p) && is_piece_in_space(p, space))
			fn(p);
	}
}

function for_each_piece_in_force(force, fn) {
	for (let p = 0; p < pieces.length; ++p)
		if (is_piece_in_force(p, force))
			fn(p);
}

function for_each_leader_in_force(force, fn) {
	for (let p = 0; p < pieces.length; ++p)
		if (is_leader(p) && is_piece_in_force(p, force))
			fn(p);
}

function for_each_unit_in_force(force, fn) {
	for (let p = 0; p < pieces.length; ++p)
		if (!is_leader(p) && is_piece_in_force(p, force))
			fn(p);
}

function for_each_british_controlled_port(fn) {
	for (let i = 0; i < ports.length; ++i)
		if (is_british_controlled_space(ports[i]))
			fn(ports[i]);
}

function list_auxiliary_units_in_force(force) {
	let list = [];
	for_each_unit_in_force(force, p => {
		if (is_auxiliary_unit(p))
			list.push(p);
	});
	return list;
}

// STATIC PROPERTIES

function get_department(space) {
	if (departments.st_lawrence.includes(space))
		return departments.st_lawrence;
	if (departments.northern.includes(space))
		return departments.northern;
	if (departments.southern.includes(space))
		return departments.southern;
	return null;
}

function department_militia(space) {
	if (departments.st_lawrence.includes(space))
		return ST_LAWRENCE_CANADIAN_MILITIAS;
	if (departments.northern.includes(space))
		return NORTHERN_COLONIAL_MILITIAS;
	if (departments.southern.includes(space))
		return SOUTHERN_COLONIAL_MILITIAS;
	return 0;
}

function space_name(s) {
	return spaces[s].name;
}

function is_lake_connection(from, to) {
	let exits = spaces[from].lakeshore;
	for (let i = 0; i < exits.length; ++i)
		if (exits[i] === to)
			return true;
	return false;
}

function is_wilderness_or_mountain(space) {
	let type = spaces[space].type;
	return type === 'wilderness' || type === 'mountain';
}

function is_wilderness(space) {
	return spaces[space].type === 'wilderness';
}

function is_mountain(space) {
	return spaces[space].type === 'mountain';
}

function is_cultivated(space) {
	return spaces[space].type === 'cultivated';
}

function is_militia_box(space) {
	return spaces[space].type === 'militia-box';
}

function is_leader_box(space) {
	return spaces[space].type === 'leader-box';
}

function is_originally_friendly(space) {
	return originally_friendly_spaces[friendly()].includes(space);
}

function is_originally_enemy(space) {
	return originally_friendly_spaces[enemy()].includes(space);
}

function is_fortress(space) {
	return fortresses.includes(space);
}

function is_port(space) {
	return ports.includes(space);
}

function is_only_port_space(space) {
	return space === HALIFAX || space === LOUISBOURG;
}

function is_leader(p) {
	return pieces[p].type === 'leader';
}

function is_unit(p) {
	return pieces[p].type !== 'leader';
}

function is_british_iroquois_or_mohawk(p) {
	return british_iroquois_or_mohawk_units.includes(p);
}

function is_provincial_unit(p) {
	switch (pieces[p].type) {
	case 'northern-provincials': return true;
	case 'southern-provincials': return true;
	}
	return false;
}

function is_provincial_unit_from(p, type) {
	switch (pieces[p].type) {
	case 'northern-provincials': return type === 'northern';
	case 'southern-provincials': return type === 'southern';
	}
	return false;
}

function is_drilled_troops(p) {
	switch (pieces[p].type) {
	case 'regulars': return true;
	case 'light-infantry': return true;
	case 'northern-provincials': return true;
	case 'southern-provincials': return true;
	}
	return false;
}

function is_militia_unit(p) {
	return pieces[p].type === 'militias';
}

function is_light_infantry_unit(p) {
	return pieces[p].type === 'light-infantry';
}

function is_indian_unit(p) {
	return pieces[p].type === 'indians';
}

function is_indian_tribe(p, tribe) {
	return pieces[p].type === 'indians' && pieces[p].name === tribe;
}

function indian_home_settlement(p) {
	return pieces[p].settlement || 0;
}

function is_regulars_unit(p) {
	return pieces[p].type === 'regulars';
}

function is_highland_unit(p) {
	return pieces[p].type === 'regulars' && pieces[p].subtype === 'highland';
}

function is_royal_american_unit(p) {
	return pieces[p].type === 'regulars' && pieces[p].subtype === 'royal';
}

function is_3_4_regular_unit(p) {
	return pieces[p].type === 'regulars' && pieces[p].subtype === undefined;
}

function is_western_indian_unit(p) {
	return pieces[p].type === 'indians' && pieces[p].subtype === 'western';
}

function is_pays_d_en_haut_indian_unit(p) {
	return pieces[p].type === 'indians' && pieces[p].subtype === 'pays-d-en-haut';
}

function is_rangers_unit(p) {
	return pieces[p].type === 'rangers';
}

function is_coureurs_unit(p) {
	return pieces[p].type === 'coureurs';
}

function is_auxiliary_unit(p) {
	switch (pieces[p].type) {
	case 'indians': return true;
	case 'coureurs': return true;
	case 'rangers': return true;
	}
	return false;
}

function piece_name(p) {
	return pieces[p].name;
}

function piece_movement(p) {
	return pieces[p].movement;
}

function leader_box_leader(s) {
	return spaces[s].leader;
}

function leader_box(p) {
	return pieces[p].box;
}

function leader_initiative(p) {
	return pieces[p].initiative;
}

function leader_command(p) {
	return pieces[p].command;
}

function force_command(force) {
	let n = 0;
	for_each_leader_in_force(force, p => {
		n += leader_command(p);
	});
	return n;
}

function leader_tactics(p) {
	return pieces[p].tactics;
}

// DYNAMIC PROPERTIES

function piece_node(p) {
	return game.pieces.location[p];
}

function piece_space(p) {
	let where = piece_node(p);
	if (is_leader_box(where))
		return piece_node(leader_box_leader(where));
	return where;
}

// is piece commanded by a leader (or self)
function is_piece_in_force(p, force) {
	return (p === force) || (piece_node(p) === leader_box(force));
}

function count_non_british_iroquois_and_mohawk_units_in_leader_box(leader) {
	let n = 0;
	for_each_friendly_unit_in_node(leader_box(leader), p => {
		if (!is_british_iroquois_or_mohawk(p))
			++n;
	});
	return n;
}

function count_pieces_in_force(force) {
	let n = 0;
	for_each_piece_in_force(force, p => {
		++n;
	});
	return n;
}

function count_units_in_force(force) {
	let n = 0;
	for_each_unit_in_force(force, p => {
		++n;
	});
	return n;
}

function count_friendly_units_inside(where) {
	let n = 0;
	for_each_friendly_unit_in_space(where, p => {
		if (is_piece_inside(p))
			++n;
	});
	return n;
}

function count_friendly_units_in_space(where) {
	let n = 0;
	for_each_friendly_unit_in_space(where, p => {
		++n;
	});
	return n;
}

function count_unbesieged_enemy_units_in_space(where) {
	let n = 0;
	for_each_unbesieged_enemy_in_space(where, p => {
		++n;
	});
	return n;
}

function unit_strength(p) {
	if (is_unit_reduced(p))
		return pieces[p].reduced_strength;
	return pieces[p].strength;
}

function is_unit_reduced(p) {
	return game.pieces.reduced.includes(p);
}

function set_unit_reduced(p, v) {
	if (v) {
		if (!game.pieces.reduced.includes(p))
			game.pieces.reduced.push(p);
	} else {
		remove_from_array(game.pieces.reduced, p);
	}
}

function is_piece_inside(p) {
	return game.pieces.inside.includes(p);
}

function is_piece_unbesieged(p) {
	return !game.pieces.inside.includes(p);
}

function set_piece_inside(p) {
	if (!game.pieces.inside.includes(p))
		game.pieces.inside.push(p);
}

function set_piece_outside(p) {
	remove_from_array(game.pieces.inside, p);
}

function set_force_inside(force) {
	for_each_piece_in_force(force, p => {
		set_piece_inside(p);
	});
	unstack_force(force);
}

function is_piece_on_map(p) {
	// TODO: militia boxes?
	return piece_node(p) !== 0;
}

function is_piece_unused(p) {
	return piece_node(p) === 0;
}

function is_piece_in_node(p, node) {
	return piece_node(p) === node;
}

function is_piece_in_space(p, space) {
	return piece_space(p) === space;
}

function has_amphib(space) {
	return game.Britain.amphib.includes(space);
}

function has_friendly_amphib(space) {
	return game.active === BRITAIN && game.Britain.amphib.includes(space);
}

function has_enemy_amphib(space) {
	return game.active === FRANCE && game.Britain.amphib.includes(space);
}

function has_fieldworks(space) {
	return game.fieldworks.includes(space);
}

function place_fieldworks(s) {
	log(`Fieldworks placed at ${space_name(s)}.`);
	game.fieldworks.push(s);
}

function remove_fieldworks(s) {
	if (game.fieldworks.includes(s)) {
		log(`Fieldworks removed at ${space_name(s)}.`);
		remove_from_array(game.fieldworks, s);
	}
}

function place_friendly_raided_marker(space) {
	player.raids.push(space);
}

function has_friendly_raided_marker(space) {
	return player.raids.includes(space);
}

function has_enemy_raided_marker(space) {
	return enemy_player.raids.includes(space);
}

function is_space_besieged(space) {
	return space in game.sieges;
}

function is_space_unbesieged(space) {
	return !is_space_besieged(space);
}

function has_enemy_allied_settlement(space) {
	return enemy_player.allied.includes(space);
}

function has_friendly_allied_settlement(space) {
	return player.allied.includes(space);
}

function has_enemy_stockade(space) {
	return enemy_player.stockades.includes(space);
}

function has_friendly_stockade(space) {
	return player.stockades.includes(space);
}

function has_enemy_fortress(space) {
	return enemy_player.fortresses.includes(space);
}

function has_friendly_fortress(space) {
	return player.fortresses.includes(space);
}

function has_enemy_fort(space) {
	return enemy_player.forts.includes(space);
}

function has_friendly_fort(space) {
	return player.forts.includes(space);
}

function has_enemy_fort_uc(space) {
	return enemy_player.forts_uc.includes(space);
}

function has_friendly_fort_uc(space) {
	return player.forts_uc.includes(space);
}

function has_enemy_fort_or_fortress(space) {
	return has_enemy_fort(space) || has_enemy_fortress(space);
}

function has_enemy_fortifications(space) {
	return has_enemy_stockade(space) || has_enemy_fort(space) || has_enemy_fortress(space);
}

function has_friendly_fort_or_fortress(space) {
	return has_friendly_fort(space) || has_friendly_fortress(space);
}

function has_friendly_fortifications(space) {
	return has_friendly_stockade(space) || has_friendly_fort(space) || has_friendly_fortress(space);
}

function has_unbesieged_friendly_fortifications(space) {
	return is_space_unbesieged(space) && has_friendly_fortifications(space);
}

function has_unbesieged_friendly_fortress(space) {
	return is_space_unbesieged(space) && has_friendly_fortress(space);
}

function has_friendly_pieces(space) {
	for (let p = first_friendly_piece; p <= last_friendly_piece; ++p)
		if (is_piece_in_space(p, space))
			return true;
	return false;
}

function has_friendly_units(space) {
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
		if (is_piece_in_space(p, space))
			return true;
	return false;
}

function has_enemy_units(space) {
	for (let p = first_enemy_unit; p <= last_enemy_unit; ++p)
		if (is_piece_in_space(p, space))
			return true;
	return false;
}

function has_french_units(space) {
	for (let p = first_french_unit; p <= last_french_unit; ++p)
		if (is_piece_in_space(p, space))
			return true;
	return false;
}

function has_british_units(space) {
	for (let p = first_british_unit; p <= last_british_unit; ++p)
		if (is_piece_in_space(p, space))
			return true;
	return false;
}

function has_french_drilled_troops(space) {
	for (let p = first_french_unit; p <= last_french_unit; ++p)
		if (is_piece_in_space(p, space))
			if (is_drilled_troops(p))
				return true;
	return false;
}

function has_british_drilled_troops(space) {
	for (let p = first_british_unit; p <= last_british_unit; ++p)
		if (is_piece_in_space(p, space))
			if (is_drilled_troops(p))
				return true;
	return false;
}

function is_originally_british(space) {
	return originally_friendly_spaces.Britain.includes(space);
}

function is_french_controlled_space(space) {
	if (game.active === FRANCE)
		return is_friendly_controlled_space(space);
	return is_enemy_controlled_space(space);
}

function has_french_stockade(space) {
	return game.France.stockades.includes(space);
}

function has_french_fort(space) {
	return game.France.forts.includes(space);
}

function has_french_fortress(space) {
	return is_fortress(space) && is_french_controlled_space(space);
}

function has_french_fortifications(space) {
	return has_french_stockade(space) || has_french_fort(space) || has_french_fortress(space);
}

function has_unbesieged_french_fortification(space) {
	return is_space_unbesieged(space) && has_french_fortifications(space);
}

function count_enemy_units_in_space(space) {
	let n = 0;
	for (let p = first_enemy_unit; p <= last_enemy_unit; ++p)
		if (is_piece_in_space(p, space))
			++n;
	return n;
}

function has_unbesieged_enemy_leader(space) {
	for (let p = first_enemy_leader; p <= last_enemy_leader; ++p)
		if (is_piece_in_space(p, space) && !is_piece_inside(p))
			return true;
	return false;
}

function has_unbesieged_enemy_units(space) {
	for (let p = first_enemy_unit; p <= last_enemy_unit; ++p)
		if (is_piece_in_space(p, space) && !is_piece_inside(p))
			return true;
	return false;
}

function has_unbesieged_enemy_units_that_did_not_intercept(space) {
	for (let p = first_enemy_unit; p <= last_enemy_unit; ++p)
		if (is_piece_in_space(p, space) && !is_piece_inside(p) && !did_piece_intercept(p))
			return true;
	return false;
}

function is_friendly_controlled_space(space) {
	if (is_space_unbesieged(space) && !has_enemy_units(space)) {
		if (is_originally_enemy(space)) {
			if (has_friendly_units(space) || has_friendly_stockade(space) || has_friendly_fort(space))
				return true;
			if (has_friendly_amphib(space))
				return true;
		} else if (is_originally_friendly(space)) {
			return true;
		} else {
			if (has_friendly_units(space) || has_friendly_stockade(space) || has_friendly_fort(space))
				return true;
		}
	}
	return false;
}

function is_enemy_controlled_space(space) {
	if (is_space_unbesieged(space) && !has_friendly_units(space)) {
		if (is_originally_friendly(space)) {
			if (has_enemy_units(space) || has_enemy_stockade(space) || has_enemy_fort(space))
				return true;
			if (has_enemy_amphib(space))
				return true;
		} else if (is_originally_enemy(space)) {
			return true;
		} else {
			if (has_enemy_units(space) || has_enemy_stockade(space) || has_enemy_fort(space))
				return true;
		}
	}
	return false;
}

function is_british_controlled_space(space) {
	if (game.active === BRITAIN)
		return is_friendly_controlled_space(space);
	return is_enemy_controlled_space(space);
}

function is_friendly_controlled_port(space) {
	return is_port(space) && is_friendly_controlled_space(space);
}

function has_friendly_supplied_drilled_troops(space) {
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
		if (is_drilled_troops(p) && is_piece_in_space(p, space) && is_in_supply(space))
			return true;
	return false;
}

function has_friendly_drilled_troops(space) {
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
		if (is_drilled_troops(p) && is_piece_in_space(p, space))
			return true;
	return false;
}

function has_friendly_regulars(space) {
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
		if (is_regulars_unit(p) && is_piece_in_space(p, space))
			return true;
	return false;
}

function has_friendly_rangers(space) {
	if (game.active === BRITAIN)
		for (let p = first_british_unit; p <= last_british_unit; ++p)
			if (is_rangers_unit(p) && is_piece_in_space(p, space))
				return true;
	return false;
}

function has_friendly_coureurs(space) {
	if (game.active === FRANCE)
		for (let p = first_french_piece; p <= last_french_piece; ++p)
			if (is_coureurs_unit(p) && is_piece_in_space(p, space))
				return true;
	return false;
}

function has_friendly_indians(space) {
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
		if (is_indian_unit(p) && is_piece_in_space(p, space))
			return true;
	return false;
}

function has_unbesieged_enemy_auxiliary(space) {
	for (let p = first_enemy_unit; p <= last_enemy_unit; ++p)
		if (is_auxiliary_unit(p) && is_piece_in_space(p, space) && !is_piece_inside(p))
			return true;
	return false;
}

function has_unbesieged_friendly_auxiliary(space) {
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
		if (is_auxiliary_unit(p) && is_piece_in_space(p, space) && !is_piece_inside(p))
			return true;
	return false;
}

function has_unbesieged_enemy_fortifications(space) {
	return is_space_unbesieged(space) && has_enemy_fortifications(space);
}

function has_besieged_enemy_fortifications(space) {
	return is_space_besieged(space) && has_enemy_fortifications(space);
}

function has_unbesieged_enemy_fort_or_fortress(space) {
	return is_space_unbesieged(space) && has_enemy_fort_or_fortress(space);
}

function has_non_moving_unbesieged_friendly_units(space) {
	let force = moving_piece();
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p) {
		if (is_piece_in_space(p, space) && is_piece_unbesieged(p)) {
			if (!is_piece_in_force(p, force))
				return true;
		}
	}
	return false;
}

function has_unbesieged_friendly_units(space) {
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
		if (is_piece_in_space(p, space) && is_piece_unbesieged(p))
			return true;
	return false;
}

function has_besieged_friendly_units(space) {
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
		if (is_piece_in_space(p, space) && is_piece_inside(p))
			return true;
	return false;
}

function count_militia_in_department(box) {
	let list = (box === ST_LAWRENCE_CANADIAN_MILITIAS ? french_militia_units : british_militia_units);
	for (let i = 0; i < list.length; ++i)
		if (piece_node(list[i]) === box)
			return true;
	return false;
}

function enemy_department_has_at_least_n_militia(where, n) {
	let box = department_militia(where);
	if (box) {
		if (game.active === BRITAIN && box === ST_LAWRENCE_CANADIAN_MILITIAS)
			return count_militia_in_department(box) >= n;
		if (game.active === FRANCE && (box === NORTHERN_COLONIAL_MILITIAS || box === SOUTHERN_COLONIAL_MILITIAS))
			return count_militia_in_department(box) >= n;
	}
	return false;
}

// Is a leader moving alone without a force.
function is_lone_leader(who) {
	return is_leader(who) && count_pieces_in_force(who) === 1;
}

// Is a single auxiliary unit (with or without leaders)
function is_lone_auxiliary(who) {
	if (is_leader(who)) {
		let only_ax = true;
		let ax_count = 0;
		for_each_unit_in_force(who, p => {
			if (is_auxiliary_unit(p))
				++ax_count;
			else
				only_ax = false;
		});
		return only_ax && ax_count === 1;
	}
	return is_auxiliary_unit(who);
}

function force_has_drilled_troops(who) {
	if (is_leader(who)) {
		let has_dt = false;
		for_each_unit_in_force(who, p => {
			if (is_drilled_troops(p))
				has_dt = true;
		});
		return has_dt;
	}
	return is_drilled_troops(who);
}

function force_has_auxiliary_unit(who) {
	if (is_leader(who)) {
		let has_ax = false;
		for_each_unit_in_force(who, p => {
			if (is_auxiliary_unit(p))
				has_ax = true;
		});
		return has_ax;
	}
	return is_auxiliary_unit(who);
}

function force_has_only_auxiliary_units(who) {
	if (is_leader(who)) {
		let only_ax = true;
		for_each_unit_in_force(who, p => {
			if (!is_auxiliary_unit(p))
				only_ax = false;
		});
		return only_ax;
	}
	return is_auxiliary_unit(who);
}

function is_raid_space(space) {
	if (has_friendly_fort(space))
		return false;
	if (has_friendly_fortress(space))
		return false;
	if (has_friendly_stockade(space))
		return false;
	if (has_friendly_drilled_troops(space))
		return false;

	if (is_originally_enemy(space))
		return true;
	if (has_enemy_stockade(space))
		return true;
	if (has_enemy_allied_settlement(space))
		return true;

	return false;
}

function movement_allowance(who) {
	let m = piece_movement(who);
	for_each_unit_in_force(who, p => {
		let pm = piece_movement(p);
		if (pm < m)
			m = pm;
	});
	return m;
}

function moving_piece() {
	return game.move.moving;
}

function moving_piece_space() {
	return game.move.where;
}

function intercepting_piece() {
	return game.move.intercepting;
}

function avoiding_piece() {
	return game.move.avoiding;
}

function moving_piece_came_from() {
	return game.move.came_from;
}

function battle_space() {
	return game.battle.where;
}

function find_friendly_commanding_leader_in_space(space) {
	let commander = 0;
	for (let p = first_friendly_leader; p <= last_friendly_leader; ++p)
		if (is_piece_in_space(p, space))
			if (!commander || leader_command(p) > leader_command(commander))
				// TODO: prefer commander with higher tactics rating if same command rating
				commander = p;
	return commander;
}

function find_enemy_commanding_leader_in_space(space) {
	let commander = 0;
	for (let p = first_enemy_leader; p <= last_enemy_leader; ++p)
		if (is_piece_in_space(p, space))
			if (!commander || leader_command(p) > leader_command(commander))
				commander = p;
	return commander;
}

// GAME STATE CHANGE HELPERS

function log_vp(n) {
	if (game.active === FRANCE) {
		if (n < 0)
			log(`France loses ${-n} VP.`);
		else
			log(`France gains ${n} VP.`);
	} else {
		if (n < 0)
			log(`Britain gains ${-n} VP.`);
		else
			log(`Britain loses ${n} VP.`);
	}
}

function award_vp(n) {
	if (game.active === FRANCE) {
		log_vp(n);
		game.tracks.vp += n;
	} else {
		log_vp(-n);
		game.tracks.vp -= n;
	}
}

function award_french_vp(n) {
	log_vp(n);
	game.tracks.vp += n;
}

function award_british_vp(n) {
	log_vp(-n);
	game.tracks.vp -= n;
}

function remove_friendly_stockade(space) {
	remove_from_array(player.stockades, space);
}

function remove_friendly_fort_uc(space) {
	remove_from_array(player.forts_uc, space);
}

function remove_friendly_fort(space) {
	remove_from_array(player.forts, space);
}

function remove_enemy_fort_uc(space) {
	remove_from_array(enemy_player.forts_uc, space);
}

function place_friendly_fort(space) {
	remove_friendly_stockade(space);
	remove_friendly_fort_uc(space);
	player.forts.push(space);
}

function place_friendly_fort_uc(space) {
	player.forts_uc.push(space);
}

// Isolate piece from any forces it may be involved in.
function unstack_force(p) {
	let s = piece_space(p);
	if (is_leader(p))
		move_pieces_from_node_to_node(leader_box(p), s);
}

function unstack_piece_from_force(p) {
	move_piece_to(p, piece_space(p));
}

function restore_unit(p) {
	let s = piece_space(p);
	log(`${piece_name(p)} restored at ${space_name(s)}.`);
	set_unit_reduced(p, 0);
}

function reduce_unit(p) {
	if (is_unit_reduced(p)) {
		eliminate_piece(p);
		return true;
	}
	set_unit_reduced(p, 1);
	log(piece_name(p) + " is reduced.");
	return false;
}

function eliminate_piece(p) {
	log(piece_name(p) + " is eliminated.");
	unstack_force(p);
	set_unit_reduced(p, 0);
	game.pieces.location[p] = 0;
	if (is_indian_unit(p)) {
		let home = indian_home_settlement(p);
		if (home) {
			let tribe = indian_tribe[home];
			if (is_indian_tribe_eliminated(home)) {
				if (home == PAYS_D_EN_HAUT)
					log(`Removed settlement at ${space_name(home)}.`);
				else
					log(`Removed ${tribe} settlement at ${space_name(home)}.`);
				if (pieces[p].faction === 'british')
					remove_from_array(game.Britain.allied, home);
				else
					remove_from_array(game.France.allied, home);
			}
		}
	}
}

function eliminate_indian_tribe(tribe) {
	// OPTIMIZE: indian unit piece ranges
	for (let p = 1; p < pieces.length; ++p)
		if (is_indian_tribe(p, tribe) && is_piece_unbesieged(p))
			eliminate_piece(p);
}

function is_indian_tribe_eliminated(home) {
	// OPTIMIZE: indian unit piece ranges
	if (home === PAYS_D_EN_HAUT) {
		for (let p = 1; p < pieces.length; ++p)
			if (is_pays_d_en_haut_indian_unit(p))
				if (is_piece_on_map(p))
					return false;
	} else {
		let tribe = indian_tribe[home];
		for (let p = 1; p < pieces.length; ++p)
			if (is_indian_tribe(p, tribe))
				if (is_piece_on_map(p))
					return false;
	}
	return true;
}

function move_piece_to(who, to) {
	game.pieces.location[who] = to;
}

function is_seven_command_leader(who) {
	return who === ABERCROMBY || who === AMHERST || who === BRADDOCK || who === LOUDOUN;
}

function place_piece(who, to) {
	log(`${piece_name(who)} placed at ${space_name(to)}.`);

	// remember last placed 7-command leader(s)
	if (is_seven_command_leader(who)) {
		if (count_7_command_leaders_in_play() >= 2) {
			if (game.seven)
				game.seven.push(who);
			else
				game.seven = [ who ];
		}
	}

	game.pieces.location[who] = to;
	if (is_indian_unit(who)) {
		let home = indian_home_settlement(who);
		if (home) {
			let tribe = indian_tribe[home];
			if (pieces[who].faction === 'british') {
				if (!game.Britain.allied.includes(home)) {
					log(`Placed ${tribe} settlement at ${space_name(home)}.`);
					game.Britain.allied.push(home);
				}
			} else {
				if (!game.France.allied.includes(home)) {
					log(`Placed ${tribe} settlement at ${space_name(home)}.`);
					game.France.allied.push(home);
				}
			}
		}
	}
}

function move_pieces_from_node_to_node(from, to) {
	for (let p = 0; p < pieces.length; ++p) {
		if (piece_node(p) === from)
			move_piece_to(p, to);
	}
}

function capture_enemy_fortress(s) {
	log("captures fortress");
	remove_from_array(enemy_player.fortresses, s);
	player.fortresses.push(s);
	award_vp(3);
}

function recapture_french_fortress(s) {
	log(`France recaptures fortress at ${space_name(s)}.`);
	remove_from_array(game.Britain.fortresses, s);
	game.France.fortresses.push(s);
	award_french_vp(3);
}

function recapture_british_fortress(s) {
	log(`Britain recaptures fortress at ${space_name(s)}.`);
	remove_from_array(game.France.fortresses, s);
	game.Britain.fortresses.push(s);
	award_british_vp(3);
}

function capture_enemy_fort_intact(s) {
	log(`captures enemy fort intact`);
	remove_from_array(enemy_player.forts, s);
	player.forts.push(s);
	award_vp(2);
}

function capture_enemy_fort(space) {
	log(`captures enemy fort`);
	remove_from_array(enemy_player.forts, space);
	player.forts_uc.push(space);
	award_vp(2);
}

function capture_enemy_stockade(space) {
	log(`captures enemy stockade`);
	remove_from_array(enemy_player.stockades, space);
	player.stockades.push(space);
	award_vp(1);
}

function eliminate_enemy_stockade_after_battle(space) {
	log(`eliminates enemy stockade`);
	remove_from_array(enemy_player.stockades, space);
	award_vp(1);
}

function eliminate_enemy_stockade_in_raid(space) {
	log(`eliminates enemy stockade`);
	remove_from_array(enemy_player.stockades, space);
}

function add_raid(who) {
	let where = piece_space(who);
	console.log("add_raid", piece_name(who), "in", space_name(where));
	if (where && !game.raid.list.includes(where) && is_raid_space(where))
		game.raid.list.push(where);
}

function is_vacant_of_besieging_units(space) {
	if (has_french_fort(space) || has_french_fortress(space))
		return !has_british_units(space);
	else
		return !has_french_units(space);
}

function lift_sieges_and_amphib() {
	console.log("LIFT SIEGES AND AMPHIB AND RECAPTURE FORTRESSES");

	for_each_siege(space => {
		if (is_vacant_of_besieging_units(space)) {
			log(`Siege in ${space_name(space)} lifted.`);
			for (let p = 1; p < pieces.length; ++p)
				if (is_piece_in_space(p, space))
					set_piece_outside(p);
			delete game.sieges[space];
		}
	});

	let amphib = game.Britain.amphib;
	for (let i = amphib.length-1; i >= 0; --i) {
		let s = amphib[i];
		if (!has_british_units(s)) {
			if (has_french_drilled_troops(s) || has_unbesieged_french_fortification()) {
				log(`Amphib removed from ${space_name(s)}.`);
				amphib.splice(i, 1);
			}
		}
	}

	// Recapture abandoned enemy fortresses.
	for (let s of originally_french_fortresses)
		if (game.Britain.fortresses.includes(s) && is_french_controlled_space(s))
			recapture_french_fortress(s);
	for (let s of originally_british_fortresses)
		if (game.France.fortresses.includes(s) && is_british_controlled_space(s))
			recapture_british_fortress(s);

	// Check ownership of other VP locations:
	update_vp("niagara", NIAGARA);
	update_vp("ohio_forks", OHIO_FORKS);
}

function update_vp(name, s) {
	let save = game[name];
	let v = 0;
	if (is_french_controlled_space(s))
		v = 1;
	else if (is_british_controlled_space(s))
		v = -1;
	if (v !== save)
		award_french_vp(v - save);
	game[name] = v;
}

// SUPPLY LINES

function search_supply_spaces_imp(queue) {
	console.log("======");
	let reached = queue.slice();
	while (queue.length > 0) {
		let current = queue.shift();
		// If we must have come here by water way:
		let cultivated = is_cultivated(current) || has_friendly_fortifications(current) || has_friendly_amphib(current);
		console.log("SUPPLY", space_name(current), cultivated);
		for_each_exit(current, (next, type) => {
			if (reached.includes(next))
				return; // continue
			if (has_unbesieged_enemy_units(next) || has_unbesieged_enemy_fortifications(next))
				return; // continue
			if (!cultivated) {
				// came from wilderness by water, must continue by water
				if (type !== 'land') {
					console.log("    ", space_name(next), "(adjacent-water)");
					reached.push(next);
					queue.push(next);
				}
			} else {
				// came from cultivated by any path, may continue to cultivated or by water
				if (is_cultivated(next) || has_friendly_fortifications(next) || has_friendly_amphib(next) || type !== 'land') {
					console.log("    ", space_name(next), "(from land)");
					reached.push(next);
					queue.push(next);
				}
			}
		});
	}
	console.log("====\nSUPPLY", reached.map(space_name).join("\nSUPPLY "));
	return reached;
}

function search_supply_spaces() {
	if (game.active === FRANCE) {
		let list = originally_french_fortresses.filter(is_friendly_controlled_space);
		supply_cache = search_supply_spaces_imp(list);
	} else {
		let list = originally_british_fortresses_and_ports.filter(is_friendly_controlled_space);
		for (let s of game.Britain.amphib)
			if (!list.includes(s) && is_friendly_controlled_space(s))
				list.push(s);
		supply_cache = search_supply_spaces_imp(list);
	}
}

function goto_debug_supply(role) {
	if (game.state === 'debug_supply') {
		pop_undo();
	} else {
		push_undo();
		set_active(role);
		game.state = 'debug_supply';
	}
}

states.debug_supply = {
	prompt() {
		search_supply_spaces();
		view.prompt = "Showing supply lines.";
		supply_cache.forEach(gen_action_space);
	},
	space: pop_undo
}

function is_in_supply(space) {
	if (!supply_cache)
		search_supply_spaces();
	if (supply_cache.includes(space))
		return true;
	let x = false;
	for_each_exit(space, s => {
		if (supply_cache.includes(s))
			x = true;
	})
	return x;
}

// CLOSEST PATH SEARCH

function find_closest_friendly_unbesieged_fortification(start) {
	let queue = [];
	let seen = {};
	let stop = 1000;
	let result = [];

	queue.push([start, 0]);

	while (queue.length > 0) {
		let [ here, dist ] = queue.shift();
		console.log("CLOSEST", space_name(here), dist);
		if (dist > stop)
			break;
		if (has_unbesieged_friendly_fortifications(here)) {
			console.log("  FOUND FRIENDLY FORT");
			stop = dist;
			result.push(here);
		}
		if (dist < stop) {
			for_each_exit(here, (next) => {
				if (!(next in seen))
					queue.push([next, dist+1]);
				seen[next] = 1;
			});
		}
	}

	console.log("CLOSEST =>", result);
	return result;
}

// SEQUENCE OF PLAY

function start_year() {
	if (game.tracks.year === 1759 && !game.events.pitt) {
		log("Placing Amherst, Forbes, and Wolfe into the British leader pool.");
		game.pieces.pool.push(AMHERST);
		game.pieces.pool.push(FORBES);
		game.pieces.pool.push(WOLFE);
	}

	game.tracks.season = EARLY;
	start_season();
}

function start_season() {
	switch (game.tracks.season) {
	case EARLY:
		log("");
		log(`.h1 Early Season of ${game.tracks.year}`);
		log("");
		break;
	case LATE:
		log("");
		log(`.h1 Late Season of ${game.tracks.year}`);
		log("");
		break;
	}

	if (game.events.quiberon)
		set_active(BRITAIN);
	else
		set_active(FRANCE);

	deal_cards();

	start_action_phase();
}

function end_season() {

	if (game.Britain.hand.length > 0)
		game.Britain.held = 1;
	else
		game.Britain.held = 0;

	if (game.France.hand.length > 0)
		game.France.held = 1;
	else
		game.France.held = 0;

	delete game.events.french_regulars;
	delete game.events.british_regulars;
	delete player.passed;
	delete enemy_player.passed;

	if (game.tracks.season === EARLY) {
		game.tracks.season = LATE;
		start_season();
	} else {
		end_late_season();
	}
}

function end_late_season() {
	log("");
	log(".h2 End Late Season");
	log("");
	delete game.events.no_amphib;
	delete game.events.blockhouses;
	goto_indians_and_leaders_go_home();
}

function start_action_phase() {
	game.state = 'action_phase';
	log("");
	log(`.h2 ${game.active}`);
	log("");
}

function end_action_phase() {
	lift_sieges_and_amphib();
	console.log("END ACTION PHASE");
	clear_undo();
	game.count = 0;

	if (!enemy_player.passed && enemy_player.hand.length > 0) {
		console.log("END ACTION PHASE - NEXT PLAYER");
		set_active(enemy());
		start_action_phase();
		return;
	}

	if (!player.passed && player.hand.length > 0) {
		console.log("END ACTION PHASE - SAME PLAYER");
		start_action_phase();
		return;
	}

	console.log("END ACTION PHASE - END SEASON");
	end_season();
}

function can_play_event(card) {
	let symbol = cards[card].symbol;
	if (game.active === FRANCE && symbol === 'red')
		return false;
	if (game.active === BRITAIN && symbol === 'blue')
		return false;
	let event = events[cards[card].event];
	if (event !== undefined) {
		if (event.can_play)
			return event.can_play(card);
		return true;
	}
	return false;
}

function gen_card_menu(card) {
	if (can_play_event(card))
		gen_action('play_event', card);
	gen_action('activate_force', card);
	gen_action('activate_individually', card);
	if (!player.did_construct) {
		gen_action('construct_stockades', card);
		gen_action('construct_forts', card);
	}
}

function card_name(card) {
	return `#${card} ${cards[card].name} [${cards[card].activation}]`;
}

function play_card(card) {
	log(`Played ${card_name(card)}.`);
	remove_from_array(player.hand, card);
	game.cards.current = card;
	if (card === SURRENDER)
		game.events.surrender = 1;
	if (cards[card].special === 'remove')
		game.cards.removed.push(card);
	else
		game.cards.discarded.push(card);
}

function discard_card(card, reason) {
	log(`Discarded ${card_name(card)}${reason}.`);
	remove_from_array(player.hand, card);
	game.cards.current = card;
	if (card === SURRENDER)
		game.events.surrender = 1;
	game.cards.discarded.push(card);
}

function remove_card(card) {
	remove_from_array(game.cards.discarded, card);
	game.cards.removed.push(card);
}

states.action_phase = {
	prompt() {
		view.prompt = "Action Phase \u2014 play a card.";
		for (let i = 0; i < player.hand.length; ++i)
			gen_card_menu(player.hand[i]);
		if (player.hand.length === 1 && !player.held)
			gen_action_pass();
		gen_action_demolish();
	},
	demolish_fort: goto_demolish_fort,
	demolish_stockade: goto_demolish_stockade,
	demolish_fieldworks: goto_demolish_fieldworks,
	play_event(card) {
		push_undo();
		player.did_construct = 0;
		play_card(card);
		events[cards[card].event].play(card);
	},
	activate_force(card) {
		goto_activate_force(card);
	},
	activate_individually(card) {
		goto_activate_individually(card);
	},
	construct_stockades(card) {
		goto_construct_stockades(card);
	},
	construct_forts(card) {
		goto_construct_forts(card);
	},
	pass() {
		log(game.active + " pass.");
		player.passed = 1;
		end_action_phase();
	},
}

// ACTIVATION

function goto_activate_individually(card) {
	push_undo();
	player.did_construct = 0;
	discard_card(card, " to activate auxiliaries and leaders");
	game.state = 'activate_individually';
	game.count = cards[card].activation;
	game.activation = [];
}

function goto_activate_force(card) {
	push_undo();
	player.did_construct = 0;
	discard_card(card, " to activate a force");
	game.state = 'activate_force';
	game.count = cards[card].activation;
}

events.campaign = {
	play() {
		game.state = 'select_campaign_1';
		game.count = 3;
		game.activation = [];
	}
}

states.activate_individually = {
	prompt() {
		view.prompt = `Activate units and/or leaders individually \u2014 ${format_remain(game.count)}.`;
		gen_action_next();
		if (game.count >= 1) {
			for (let p = first_friendly_leader; p <= last_friendly_leader; ++p) {
				if (is_piece_on_map(p))
					gen_action_piece(p);
			}
		}
		if (game.count > 0) {
			for (let p = first_friendly_unit; p <= last_friendly_unit; ++p) {
				if (is_piece_on_map(p)) {
					if (game.count >= 0.5) {
						if (is_indian_unit(p))
							gen_action_piece(p);
					}
					if (game.count >= 1) {
						if (is_rangers_unit(p))
							gen_action_piece(p);
						if (is_coureurs_unit(p))
							gen_action_piece(p);
						if (is_drilled_troops(p))
							if (game.activation.length === 0)
								gen_action_piece(p);
					}
				}
			}
		}
	},
	piece(piece) {
		push_undo();
		log(`Activate ${piece_name(piece)}.`);
		game.activation.push(piece);
		if (is_drilled_troops(piece))
			game.count = 0;
		else if (is_indian_unit(piece))
			game.count -= 0.5;
		else
			game.count -= 1.0;
	},
	next() {
		push_undo();
		goto_pick_move();
	},
}

states.activate_force = {
	prompt() {
		view.prompt = "Activate a Force.";
		for (let p = first_friendly_leader; p <= last_friendly_leader; ++p)
			if (is_piece_on_map(p) && leader_initiative(p) <= game.count)
				gen_action_piece(p);
		gen_action_pass();
	},
	piece(p) {
		push_undo();
		log(`Activate force led by ${piece_name(p)}.`);
		game.force = {
			commander: p,
			reason: 'move',
		};
		game.state = 'define_force';
	},
	pass() {
		end_action_phase();
	},
}

states.select_campaign_1 = {
	prompt() {
		view.prompt = "Campaign \u2014 select the first leader.";
		for (let p = first_friendly_leader; p <= last_friendly_leader; ++p) {
			if (is_piece_on_map(p))
				if (!game.activation.includes(p))
					gen_action_piece(p);
		}
	},
	piece(p) {
		push_undo();
		log(`Select force led by ${piece_name(p)}.`);
		game.force = {
			commander: p,
			reason: 'campaign_1',
		};
		game.state = 'define_force';
	},
}

states.select_campaign_2 = {
	prompt() {
		view.prompt = "Campaign \u2014 select the second leader.";
		for (let p = first_friendly_leader; p <= last_friendly_leader; ++p) {
			if (is_piece_on_map(p))
				if (!game.activation.includes(p))
					gen_action_piece(p);
		}
	},
	piece(p) {
		push_undo();
		log(`Select force led by ${piece_name(p)}.`);
		game.force = {
			commander: p,
			reason: 'campaign_2',
		};
		game.state = 'define_force';
	},
}

function goto_pick_move() {
	if (game.activation && game.activation.length > 0) {
		game.state = 'pick_move';
	} else {
		delete game.activation;
		end_action_phase();
	}
}

states.pick_move = {
	prompt() {
		view.prompt = "Select an activated force, leader, or unit to move."
		gen_action_pass();
		game.activation.forEach(gen_action_piece);
	},
	piece(p) {
		push_undo();
		remove_from_array(game.activation, p);
		goto_move_piece(p);
	},
	pass() {
		// TODO: confirm!
		delete game.activation;
		end_action_phase();
	},
}

function end_activation() {
	// Clear event flags
	delete game.events.coehorns;
	delete game.events.ambush;
	delete game.events.foul_weather;
	delete game.events.george_croghan;

	lift_sieges_and_amphib();
	clear_undo();
	goto_pick_move();
}

// DEFINE FORCE (for various actions)

states.define_force = {
	prompt() {
		let commander = game.force.commander;
		let space = piece_space(commander);

		let cmd_cap = force_command(commander);

		// 5.534 Johnson commands British Iroquois and Mohawk units for free
		let cmd_use = count_non_british_iroquois_and_mohawk_units_in_leader_box(commander);

		view.prompt = `Define the force to ${game.force.reason} with ${piece_name(commander)} from ${space_name(space)} (${cmd_use}/${cmd_cap}).`;
		view.who = commander;

		// TODO: gen_action('all');

		// pick up sub-commanders
		for_each_friendly_leader_in_node(space, p => {
			if (p !== commander && leader_command(p) <= leader_command(commander))
				gen_action_piece(p);
		});

		// drop off sub-commanders
		for_each_friendly_leader_in_node(leader_box(commander), p => {
			gen_action_piece(p);
		});

		// drop off units
		let has_br_indians = false;
		for_each_friendly_unit_in_node(leader_box(commander), p => {
			if (is_british_iroquois_or_mohawk(p))
				has_br_indians = true;
			gen_action_piece(p);
		});

		// pick up units
		for_each_friendly_unit_in_node(space, p => {
			if (is_british_iroquois_or_mohawk(p)) {
				// 5.534 Only Johnson can command British Iroquois and Mohawk (and for free)
				if (is_piece_in_force(JOHNSON, commander))
					gen_action_piece(p);
			} else {
				if (cmd_use < cmd_cap)
					gen_action_piece(p);
			}
		});


		if (cmd_use <= cmd_cap) {
			if (has_br_indians) {
				if (is_piece_in_force(JOHNSON, commander))
					gen_action_next();
			} else {
				gen_action_next();
			}
		}
	},

	piece(p) {
		push_undo();
		let commander = game.force.commander;
		let space = piece_space(commander);
		if (piece_node(p) === leader_box(commander)) {
			move_piece_to(p, space);
			if (p === JOHNSON) {
				for_each_for_each_friendly_unit_in_node(leader_box(commander), indian => {
					if (is_british_iroquois_or_mohawk(indian))
						move_piece_to(indian, space);
				});
			}
		} else {
			move_piece_to(p, leader_box(commander));
		}
	},

	next() {
		push_undo();
		let commander = game.force.commander;
		let reason = game.force.reason;
		delete game.force;
		switch (reason) {
		case 'campaign_1':
			game.activation.push(commander);
			game.state = 'select_campaign_2';
			break;
		case 'campaign_2':
			game.activation.push(commander);
			goto_pick_move();
			break;
		case 'move':
			goto_move_piece(commander);
			break;
		case 'intercept':
			attempt_intercept();
			break;
		case 'avoid':
			attempt_avoid_battle();
			break;
		default:
			throw Error("unknown reason state: " + game.reason);
		}
	},
}

// TODO: merge with define_force using reason=intercept_lone_ax
states.define_force_lone_ax = {
	prompt() {
		let commander = game.force.commander;
		let space = piece_space(commander);
		let n = count_units_in_force(commander);

		view.prompt = `Define lone auxiliary force to intercept with ${piece_name(commander)} from ${space_name(space)}.`;
		view.who = commander;

		// pick up sub-commanders
		for_each_friendly_leader_in_node(space, p => {
			if (p !== commander && leader_command(p) <= leader_command(commander))
				gen_action_piece(p);
		});

		// drop off sub-commanders
		for_each_friendly_leader_in_node(leader_box(commander), p => {
			gen_action_piece(p);
		});

		// drop off units
		let has_br_indians = false;
		for_each_friendly_unit_in_node(leader_box(commander), p => {
			if (is_british_iroquois_or_mohawk(p))
				has_br_indians = true;
			gen_action_piece(p);
		});

		// pick up units (max 1 auxiliary)
		if (n === 0) {
			for_each_friendly_unit_in_node(space, p => {
				if (is_auxiliary_unit(p)) {
					if (is_british_iroquois_or_mohawk(p)) {
						// 5.534 Only Johnson can command British Iroquois and Mohawk (and for free)
						if (is_piece_in_force(JOHNSON, commander))
							gen_action_piece(p);
					} else {
						gen_action_piece(p);
					}
				}
			});
		}

		if (n === 1) {
			if (has_br_indians) {
				if (is_piece_in_force(JOHNSON, commander))
					gen_action_next();
			} else {
				gen_action_next();
			}
		}
	},

	piece(p) {
		push_undo();
		let commander = game.force.commander;
		let space = piece_space(commander);
		if (piece_node(p) === leader_box(commander)) {
			move_piece_to(p, space);
			if (p === JOHNSON) {
				for_each_for_each_friendly_unit_in_node(leader_box(commander), indian => {
					if (is_british_iroquois_or_mohawk(indian))
						move_piece_to(indian, space);
				});
			}
		} else {
			move_piece_to(p, leader_box(commander));
		}
	},

	next() {
		push_undo();
		attempt_intercept();
	},
}

// MOVE

function goto_move_piece(who) {
	clear_undo();
	log(`Move ${piece_name(who)}.`);
	let from = piece_space(who);
	game.state = 'move';
	game.move = {
		moving: who,
		where: from,
		came_from: 0,
		infiltrated: 0,
		intercepting: null,
		intercepted: [],
		did_attempt_intercept: 0,
		avoiding: null,
		avoided: [],
		start_space: from,
		used: -1,
		did_carry: 0,
		type: is_only_port_space(from) ? 'naval' : 'boat',
	};
	game.raid = {
		where: 0,
		battle: 0,
		from: {},
		aux: list_auxiliary_units_in_force(who)
	};
	start_move();
}

function start_move() {
	if (can_moving_force_siege_or_assault()) {
		game.state = 'siege_or_move';
	} else if (is_piece_inside(moving_piece())) {
		goto_break_siege();
	} else {
		resume_move();
	}
}

states.siege_or_move = {
	prompt() {
		let where = moving_piece_space();
		if (is_assault_possible(where)) {
			// TODO: RESPONSE - Surrender! allow siege here too to allow surrender event?
			view.prompt = `You may assault at ${space_name(where)} or move.`;
			gen_action('assault');
		} else {
			view.prompt = `You may siege at ${space_name(where)} or move.`;
			gen_action('siege');
		}
		gen_action('move');
	},
	siege() {
		goto_siege(moving_piece_space());
	},
	assault() {
		goto_assault(moving_piece_space());
	},
	move() {
		resume_move();
	},
}

function goto_break_siege() {
	console.log("BREAK SIEGE");
	let here = moving_piece_space();
	game.move.came_from = here;
	goto_avoid_battle();
}

function may_naval_move(who) {
	if (game.events.foul_weather)
		return false;
	if (game.active === FRANCE && game.no_fr_naval)
		return false;
	if (is_leader(who) && count_pieces_in_force(who) > 1)
		return cards[game.cards.current].activation === 3;
	return true;
}

function land_movement_cost() {
	return game.events.foul_weather ? 2 : movement_allowance(moving_piece());
}

function max_movement_cost() {
	switch (game.move.type) {
	case 'boat': return game.events.foul_weather ? 2 : 9;
	case 'land': return land_movement_cost();
	case 'naval': return 1;
	}
}

function resume_move() {
	// Interrupt for Foul Weather response at first opportunity to move.
	if (game.move.used < 0) {
		if (is_enemy_card_available(FOUL_WEATHER)) {
			set_active(enemy());
			game.state = 'foul_weather';
			return;
		}
		game.move.used = 0;
	}

	game.state = 'move';

	console.log("RESUME_MOVE");
}

function remove_enemy_forts_uc_in_path(s) {
	if (has_enemy_fort_uc(s)) {
		log(`remove fort u/c in ${space_name(s)}`);
		remove_enemy_fort_uc(s);
	}
}

function is_land_path(from, to) {
	return spaces[from].land.includes(to);
}

function has_friendly_fortifications_or_cultivated(s) {
	return has_friendly_fortifications(s) || is_originally_friendly(s);
}

function stop_move() {
	game.move.used = 9;
}

function gen_naval_move() {
	let from = moving_piece_space();
	let candidates = (game.active === FRANCE) ? french_ports : ports;
	if (!candidates.includes(from) || !is_friendly_controlled_space(from))
		return;
	candidates.forEach(to => {
		if (to === from)
			return;
		if (is_friendly_controlled_space(to))
			gen_action_space(to);
	});
}

function is_carry_connection(from, to) {
	const from_ff = has_friendly_fortifications_or_cultivated(from);
	const to_ff = has_friendly_fortifications_or_cultivated(to);
	return (from_ff && to_ff);
}

function can_move_by_boat(from, to) {
	if (game.move.used < land_movement_cost())
		return true;
	if (is_land_path(from, to)) {
		if (!game.move.did_carry)
			return is_carry_connection(from, to);
		return false;
	}
	return true;
}

function can_infiltrate(start) {
	// TODO: search paths to see if we have enough movement points left to reach non-infiltration space
	console.log("CAN_INFILTRATE", space_name(start), game.move.used, max_movement_cost());
	let distance_to_non_infiltration_space = 1;
	return (game.move.used + distance_to_non_infiltration_space) < max_movement_cost();
}

function gen_regular_move() {
	let who = moving_piece();
	let from = moving_piece_space();
	let is_lone_ld = is_lone_leader(who);
	let is_lone_ax = is_lone_auxiliary(who);
	let has_dt = force_has_drilled_troops(who);
	for_each_exit(from, to => {
		if (is_lone_ld) {
			// Lone leaders can never enter an enemy occupied space
			if (has_unbesieged_enemy_units(to) || has_unbesieged_enemy_fortifications(to))
				return; // continue;
		} else {
			// Must have Drilled Troops to enter an enemy fort or fortress space.
			// except: Infiltration by lone auxiliary
			if (has_unbesieged_enemy_fort_or_fortress(to)) {
				if (!(has_dt || (is_lone_ax && can_infiltrate(to))))
					return; // continue
			}
		}

		if (game.move.type === 'boat') {
			if (can_move_by_boat(from, to))
				gen_action_space(to);
		} else {
			gen_action_space(to);
		}
	});
}

function apply_move(to) {
	let who = moving_piece();
	let from = moving_piece_space();

	game.move.used ++;
	game.move.where = to;
	game.move.came_from = from;
	game.raid.from[to] = from; // remember where raiders came from so they can retreat after battle

	// Downgrade from Boat to Land movement if not going by river or carries.
	if (game.move.type === 'boat') {
		if (is_land_path(from, to)) {
			if (!game.move.did_carry) {
				if (is_carry_connection(from, to))
					game.move.did_carry = 1;
				else
					game.move.type = 'land'
			} else {
				game.move.type = 'land'
			}
		}
	}

	if (game.move.type === 'land') {
		const from_ff = has_friendly_fortifications_or_cultivated(from);
		const to_ff = has_friendly_fortifications_or_cultivated(to);
		const has_dt = force_has_drilled_troops(who);
		const has_ax = force_has_auxiliary_unit(who);

		// Must stop on mountains.
		if (is_mountain(to) && !to_ff)
			stop_move();

		// Must stop in the next space after passing through...
		if (game.move.used > 1 && !from_ff) {
			// Drilled Troops that pass through wilderness must stop in the next space.
			if (has_dt && !has_ax && is_wilderness(from))
				if (!game.events.george_croghan)
					stop_move();

			// Auxiliaries that pass through enemy cultivated must stop in the next space.
			if (has_ax && !has_dt && is_originally_enemy(from))
				stop_move();
		}
	}

	game.move.infiltrated = 0;

	if (has_enemy_stockade(to)) {
		console.log("INF STK", is_lone_auxiliary(who), can_infiltrate(to));
		if (is_lone_auxiliary(who) && can_infiltrate(to))
			game.move.infiltrated = 1;
		else
			stop_move();
	}

	if (has_unbesieged_enemy_fort_or_fortress(to)) {
		if (is_lone_auxiliary(who) && can_infiltrate(to))
			game.move.infiltrated = 1;
		else
			stop_move();
	}

	if (game.move.infiltrated)
		log(`infiltrates ${space_name(to)}`);
	else
		log(`moves to ${space_name(to)}`);

	move_piece_to(who, to);
	lift_sieges_and_amphib();
}

function apply_naval_move(to) {
	let who = moving_piece();
	let from = moving_piece_space();
	game.move.used = 1;
	game.move.came_from = from;
	game.raid.from[to] = from; // remember where raiders came from so they can retreat after battle
}

states.move = {
	prompt() {
		let who = moving_piece();
		let from = piece_space(who);

		if (from) {
			view.prompt = `Move ${piece_name(who)} (${space_name(from)})`;
			if (game.move.type === 'boat') {
				if (game.move.used < land_movement_cost())
					view.prompt += " by boat or land";
				else
					view.prompt += " by boat";
				if (game.move.did_carry)
					view.prompt += " (carried)";
			} else {
				view.prompt += ` by ${game.move.type}`;
			}
			if (game.move.infiltrated)
				view.prompt += " (infiltrating)";
			view.prompt += ` \u2014 ${game.move.used}/${max_movement_cost()}.`;
		} else {
			view.prompt = `${piece_name(who)} is eliminated.`;
		}

		view.who = who;
		if (game.move.used === 0) {
			if (game.events.foul_weather && can_moving_force_siege_or_assault()) {
				if (is_assault_possible(from))
					gen_action('assault');
				else
					gen_action('siege');
			}
			if (game.active === BRITAIN && player.hand.includes(GEORGE_CROGHAN)) {
				if (force_has_drilled_troops(who))
					gen_action('play_event', GEORGE_CROGHAN);
			}
			if (is_port(from)) {
				if (game.move.type !== 'naval') {
					gen_action('naval_move');
				} else {
					// TODO: split to naval_move state
					if (!game.events.no_amphib) {
						if (game.active === BRITAIN && has_amphibious_arrow(from)) {
							for (let card = first_amphib_card; card <= last_amphib_card; ++card)
								if (player.hand.includes(card))
									gen_action('play_event', card);
						}
					}
				}
			}
		}

		if (!(game.move.infiltrated && has_unbesieged_enemy_fort_or_fortress(from)))
			gen_action_next()

		gen_action_demolish();

		if (game.move.used < max_movement_cost()) {
			if (game.move.type === 'naval')
				gen_naval_move();
			else
				gen_regular_move();
		}

		if (is_leader(who)) {
			for_each_piece_in_force(who, p => {
				if (p !== who)
					gen_action_piece(p);
			});
		}
	},
	play_event(card) {
		push_undo();
		play_card(card);
		if (card === GEORGE_CROGHAN) {
			game.events.george_croghan = 1;
			resume_move();
		} else {
			game.state = 'amphibious_landing';
		}
	},
	naval_move() {
		push_undo();
		game.move.type = 'naval';
		resume_move();
	},
	space(to) {
		push_undo();

		apply_move(to);

		if (is_enemy_card_available(LAKE_SCHOONER)) {
			let from = moving_piece_came_from();
			if (has_enemy_fortifications(to) && is_lake_connection(from, to)) {
				clear_undo();
				set_active(enemy());
				game.state = 'lake_schooner';
				return;
			}
		}

		goto_intercept();
	},
	piece(who) {
		push_undo();
		let force = moving_piece();
		let where = piece_space(force);
		log(`drops off ${piece_name(who)}`);
		move_piece_to(who, where);
		resume_move();
	},
	siege() {
		goto_siege(moving_piece_space());
	},
	assault() {
		goto_assault(moving_piece_space());
	},
	demolish_fort: goto_demolish_fort,
	demolish_stockade: goto_demolish_stockade,
	demolish_fieldworks: goto_demolish_fieldworks,
	next() {
		// Stop infiltrating (not in fort/fortress space)
		if (game.move.infiltrated) {
			game.move.infiltrated = 0;
			goto_avoid_battle();
		} else {
			end_move();
		}
	},
}

states.foul_weather = {
	prompt() {
		let p = moving_piece();
		view.who = p;
		if (player.hand.includes(FOUL_WEATHER)) {
			view.prompt = `${piece_name(p)} is about to move. You may play "Foul Weather".`;
			gen_action('play_event', FOUL_WEATHER);
		} else {
			view.prompt = `${piece_name(p)} is about to move. You don't have "Foul Weather".`;
		}
		gen_action_pass();
	},
	play_event(c) {
		play_card(c);
		game.events.foul_weather = 1;
		game.move.used = 0;
		set_active(enemy());
		resume_move();
	},
	pass() {
		game.move.used = 0;
		set_active(enemy());
		resume_move();
	}
}

states.lake_schooner = {
	prompt() {
		let p = moving_piece();
		let to = piece_space(p);
		let from = moving_piece_came_from();
		view.who = p;
		view.where = from;
		if (player.hand.includes(LAKE_SCHOONER)) {
			view.prompt = `${piece_name(p)} moved from ${space_name(from)} to ${space_name(to)}. You may play "Lake Schooner".`;
			gen_action('play_event', LAKE_SCHOONER);
		} else {
			view.prompt = `${piece_name(p)} moved from ${space_name(from)} to ${space_name(to)}. You don't have "Lake Schooner".`;
		}
		gen_action_pass();
	},
	play_event(c) {
		play_card(c);
		let who = moving_piece();
		let from = moving_piece_came_from();
		set_active(enemy());
		stop_move();
		move_piece_to(who, from);
		log(`${piece_name(who)} stops in ${space_name(from)}.`);

		// 6.63 eliminate if forced back into enemy-occupied space
		if (has_unbesieged_enemy_units(from) || has_unbesieged_enemy_fortifications(from)) {
			for_each_friendly_piece_in_space(from, p => {
				if (!is_piece_inside(p))
					eliminate_piece(p);
			});
		}

		resume_move();
	},
	pass() {
		set_active(enemy());
		goto_intercept();
	}
}

states.amphibious_landing = {
	prompt() {
		let who = moving_piece();
		let from = piece_space(who);
		view.prompt = "Place amphibious landing marker.";
		view.who = who;
		if (from === HALIFAX) {
			gen_action_space(LOUISBOURG);
		}
		if (from === LOUISBOURG) {
			gen_action_space(BAIE_ST_PAUL);
			gen_action_space(RIVIERE_OUELLE);
			gen_action_space(ILE_D_ORLEANS);
		}
	},
	space(to) {
		push_undo();
		game.Britain.amphib.push(to);
		let who = moving_piece();
		let from = piece_space(who);
		game.move.path[to] = from;
		stop_move();
		move_piece_to(who, to);
		lift_sieges_and_amphib();
		game.state = 'move';
		goto_intercept();
	},
}

function remove_siege_marker(where) {
	delete game.sieges[where];
}

function place_siege_marker(where) {
	log(`Siege begun at ${space_name(where)}.`);
	game.sieges[where] = 0;
}

function change_siege_marker(where, amount) {
	return game.sieges[where] = clamp(game.sieges[where] + amount, 0, 2);
}

function goto_battle_check() {
	let where = moving_piece_space();
	console.log("BATTLE CHECK", space_name(where));
	if (has_unbesieged_enemy_units(where)) {
		goto_battle(where, false);
	} else {
		end_move_step(false);
	}
}

function end_move_step(final) {
	console.log("END MOVE STEP");

	lift_sieges_and_amphib();
	let who = moving_piece();
	let where = moving_piece_space();
	delete game.battle;
	game.move.did_attempt_intercept = 0; // reset flag for next move step

	if (final)
		stop_move();

	// Handle death of stack...
	if (!has_friendly_pieces(where)) {
		stop_move();
		return resume_move();
	}

	if (!game.move.infiltrated) {
		if (has_unbesieged_enemy_fortifications(where)) {
			unstack_force(who);
			stop_move();
			if (has_enemy_fort(where) || is_fortress(where)) {
				place_siege_marker(where);
			}
			if (has_enemy_stockade(where)) {
				if (force_has_drilled_troops(who)) {
					capture_enemy_stockade(where);
					if (can_play_massacre())
						return goto_massacre('massacre_after_move');
				}
			}
		}
	}

	if (!is_lone_leader(who) && is_piece_on_map(who)
		&& has_unbesieged_enemy_leader(where)
		&& !has_unbesieged_enemy_units(where))
		return goto_retreat_lone_leader();

	resume_move();
}

states.massacre_after_move = {
	prompt: massacre_prompt,
	play_event(c) {
		massacre_play(c);
		resume_move();
	},
	next() {
		set_active(enemy());
		resume_move();
	}
}

function end_move() {
	let who = moving_piece();

	unstack_force(who);

	console.log("END MOVE");
	delete game.move;

	game.raid.list = [];
	for (let i = 0; i < game.raid.aux.length; ++i)
		add_raid(game.raid.aux[i]);

	goto_pick_raid();
}

// INTERCEPT

function can_be_intercepted() {
	let result = false;

	let who = moving_piece();
	let here = moving_piece_space();
	let came_from = moving_piece_came_from();

	// 6.723 Leaders moving alone can NOT be intercepted
	if (is_lone_leader(who))
		return false;

	// 6.722 entering space with friendly units or fortifications
	if (has_non_moving_unbesieged_friendly_units(here))
		return false;
	if (has_unbesieged_friendly_fortifications(here))
		return false;

	// 6.721 exception: can always intercept units infiltrating same space
	if (game.move.infiltrated) {
		if (has_unbesieged_enemy_units(here))
			return true;
	}

	const is_lone_ax = is_lone_auxiliary(who);

	for_each_exit(here, from => {
		// 6.724 may not intercept an enemy leaving their own space
		if (from === came_from)
			return; // continue

		// 6.721 Lone auxiliary in wilderness
		if (is_lone_ax && is_wilderness_or_mountain(here)) {
			if (has_unbesieged_enemy_auxiliary(from))
				result = true;
		} else {
			if (has_unbesieged_enemy_units(from))
				result = true;
		}
	});

	return result;
}

function gen_intercept() {
	let is_lone_ax = is_lone_auxiliary(moving_piece());
	let to = moving_piece_space();

	if (has_unbesieged_enemy_units(to)) {
		// 6.721 exception -- can always intercept units infiltrating same space
		if (game.move.infiltrated) {
			for_each_friendly_piece_in_space(to, p => {
				if (is_piece_unbesieged(p))
					gen_action_piece(p);
			});
		}

		for_each_exit(to, from => {
			// 6.721
			if (is_lone_ax && is_wilderness_or_mountain(to)) {
				let has_ax = false;
				let has_br_indians = false;
				for_each_friendly_unit_in_space(from, p => {
					if (is_piece_unbesieged(p)) {
						if (is_auxiliary_unit(p)) {
							gen_action_piece(p);
							if (is_british_iroquois_or_mohawk(p))
								has_br_indians = true;
							else
								has_ax = true;
						}
					}
				});
				// allow leaders to accompany intercepting auxiliary unit
				if (has_ax) {
					for_each_friendly_leader_in_space(from, p => {
						if (is_piece_unbesieged(p))
							gen_action_piece(p);
					});
				} else if (has_br_indians) {
					// TODO: allow intercept with Johnson as sub-commander
					if (is_piece_in_space(JOHNSON, from)) {
						if (is_piece_unbesieged(JOHNSON))
							gen_action_piece(JOHNSON);
					}
				}
			} else {
				for_each_friendly_piece_in_space(from, p => {
					if (is_piece_unbesieged(p))
						gen_action_piece(p);
				});
			}
		});
	}
}

function goto_intercept() {
	let who = moving_piece();

	let here = moving_piece_space();
	if (force_has_drilled_troops(who))
		remove_enemy_forts_uc_in_path(here);

	if (can_be_intercepted()) {
		clear_undo();
		set_enemy_active('intercept_who');
	} else {
		if (game.move.infiltrated)
			end_move_step();
		else
			goto_declare_inside();
	}
}

function is_moving_piece_lone_ax_in_wilderness_or_mountain() {
	let p = moving_piece();
	let s = piece_space(p);
	return is_lone_auxiliary(p) && is_wilderness_or_mountain(s);
}

states.intercept_who = {
	prompt() {
		let who = moving_piece();
		let where = moving_piece_space();
		view.prompt = "Select a force or unit to intercept into " + space_name(where) + ".";
		view.where = where;
		gen_action_pass();
		gen_intercept();
	},
	piece(p) {
		console.log("INTERCEPT WITH", piece_name(p));
		let to = moving_piece_space();
		let from = piece_space(p);
		// All units can intercept in same space (even lone ax in wilderness), but no need to define the force.
		if (is_leader(p) && from !== to) {
			push_undo();
			game.move.intercepting = p;
			game.force = {
				commander: p,
				reason: 'intercept',
			};
			if (is_moving_piece_lone_ax_in_wilderness_or_mountain() && from !== to) {
				game.state = 'define_force_lone_ax';
			} else {
				game.state = 'define_force';
			}
		} else {
			game.move.intercepting = p;
			attempt_intercept();
		}
	},
	pass() {
		log(`${game.active} decline to intercept`);
		game.move.intercepting = 0;
		end_intercept_fail();
	},
}

function did_attempt_intercept_to_space(space) {
	return game.move.intercepted_spaces.includes(space);
}

function attempt_intercept() {
	let piece = intercepting_piece();
	let tactics = 0;
	if (is_leader(piece)) {
		tactics = leader_tactics(piece);
		for_each_piece_in_force(piece, p => {
			game.move.intercepted.push(p)
		});
	} else {
		game.move.intercepted.push(piece);
	}
	game.move.did_attempt_intercept = 1;

	let roll = roll_die("to intercept");
	if (roll + tactics >= 4) {
		if (is_leader(piece))
			log(`${piece_name(piece)} attempts to intercept:\n${roll} + ${tactics} >= 4 \u2014 success!`);
		else
			log(`${piece_name(piece)} attempts to intercept:\n${roll} >= 4 \u2014 success!`);
		end_intercept_success();
	} else {
		if (is_leader(piece))
			log(`${piece_name(piece)} attempts to intercept:\n${roll} + ${tactics} < 4 \u2014 failure!`);
		else
			log(`${piece_name(piece)} attempts to intercept:\n${roll} < 4 \u2014 failure!`);
		end_intercept_fail();
	}
}

function end_intercept_fail() {
	let who = intercepting_piece();
	if (who)
		unstack_force(who);
	set_enemy_active('move');
	if (game.move.infiltrated)
		end_move_step();
	else
		goto_declare_inside();
}

function end_intercept_success() {
	let who = intercepting_piece();
	let to = moving_piece_space();
	console.log("INTERCEPT SUCCESS " + piece_name(who) + " TO " + space_name(to));
	move_piece_to(who, to);
	unstack_force(who);
	set_enemy_active('move');
	goto_declare_inside();
}

// DECLARE INSIDE/OUTSIDE FORTIFICATION

function goto_declare_inside() {
	if (game.move.infiltrated)
		return goto_avoid_battle();
	let where = moving_piece_space();
	if (has_unbesieged_enemy_units_that_did_not_intercept(where)) {
		if (is_fortress(where) || has_enemy_fort(where)) {
			console.log("DECLARE INSIDE/OUTSIDE");
			set_enemy_active('declare_inside');
			return;
		}
	}
	goto_avoid_battle();
}

states.declare_inside = {
	prompt() {
		let where = moving_piece_space();
		view.prompt = "Declare which units and leaders withdraw into the fortification.";
		gen_action_next();
		let n = count_friendly_units_inside(where);
		for_each_friendly_piece_in_space(where, p => {
			if (!is_piece_inside(p) && !did_piece_intercept(p)) {
				if (is_leader(p) || is_fortress(where) || n < 4)
					gen_action_piece(p);
			}
		});
	},
	piece(piece) {
		console.log("INSIDE WITH", piece_name(piece));
		push_undo();
		set_piece_inside(piece);
	},
	next() {
		set_active(enemy());
		goto_avoid_battle();
	},
}

// AVOID BATTLE

function goto_avoid_battle() {
	let space = moving_piece_space();
	if (has_unbesieged_enemy_units(space)) {
		if (!game.move.did_attempt_intercept) {
			if (can_enemy_avoid_battle(space)) {
				console.log("AVOID BATTLE " + space_name(space));
				set_enemy_active('avoid_who');
				return;
			}
		}
	}
	goto_battle_check(space);
}

function did_piece_intercept(p) {
	return game.move.intercepted.includes(p);
}

function did_piece_avoid_battle(p) {
	return game.move.avoided.includes(p);
}

states.avoid_who = {
	prompt() {
		let from = piece_space(moving_piece());
		view.prompt = "Select a force or unit to avoid battle in " + space_name(from) + ".";
		gen_action_pass();
		for_each_friendly_piece_in_space(from, p => {
			if (!did_piece_intercept(p) && !is_piece_inside(p))
				gen_action_piece(p);
		});
	},
	piece(piece) {
		console.log("AVOID BATTLE WITH", piece_name(piece));
		if (is_leader(piece)) {
			push_undo();
			game.move.avoiding = piece;
			game.force = {
				commander: piece,
				reason: 'avoid',
			};
			game.state = 'define_force';
		} else {
			game.move.avoiding = piece;
			attempt_avoid_battle();
		}
	},
	pass() {
		log(`${game.active} decline to avoid battle`);
		game.move.avoiding = 0;
		end_avoid_battle();
	},
}

function attempt_avoid_battle() {
	let from = moving_piece_space();
	let piece = avoiding_piece();
	let tactics = 0;
	if (is_leader(piece)) {
		tactics = leader_tactics(piece);
		for_each_piece_in_force(piece, p => {
			game.move.avoided.push(p)
		});
	} else {
		game.move.avoided.push(piece);
	}

	// 6.8 Exception: Auxiliary and all-Auxiliary forces automatically succeed.
	if (is_wilderness_or_mountain(from) && force_has_only_auxiliary_units(piece)) {
		log(`${piece_name(piece)} automatically avoids battle from ${from.type} space.`);
		game.state = 'avoid_to';
		return;
	}

	let roll = roll_die("to avoid battle");
	if (roll + tactics >= 4) {
		if (is_leader(piece))
			log(`${piece_name(piece)} attempts to avoid battle:\n${roll} + ${tactics} >= 4 \u2014 success!`);
		else
			log(`${piece_name(piece)} attempts to avoid battle:\n${roll} >= 4 \u2014 success!`);
		game.state = 'avoid_to';
	} else {
		if (is_leader(piece))
			log(`${piece_name(piece)} attempts to avoid battle:\n${roll} + ${tactics} < 4 \u2014 failure!`);
		else
			log(`${piece_name(piece)} attempts to avoid battle:\n${roll} < 4 \u2014 failure!`);
		end_avoid_battle();
	}
}

function can_enemy_avoid_battle(from) {
	let can_avoid = false;
	for_each_exit(from, to => {
		if ((moving_piece_came_from() !== to)
			&& !has_unbesieged_friendly_units(to)
			&& !has_unbesieged_friendly_fortifications(to))
			can_avoid = true;
	});
	// 6.811 British units in Amphib space may avoid directly to port
	if (game.active === FRANCE) {
		if (has_amphib(from)) {
			for_each_british_controlled_port(to => {
				if (to !== from)
					can_avoid = true;
			});
		}
	}
	return can_avoid;
}

states.avoid_to = {
	prompt() {
		let from = piece_space(moving_piece());
		view.prompt = "Select where to avoid battle to.";
		gen_action_pass();
		for_each_exit(from, to => {
			if ((moving_piece_came_from() !== to)
				&& !has_unbesieged_enemy_units(to)
				&& !has_unbesieged_enemy_fortifications(to))
				gen_action_space(to);
		});
		// 6.811 British units in Amphib space may avoid directly to port
		if (game.active === BRITAIN) {
			if (has_amphib(from)) {
				for_each_british_controlled_port(to => {
					if (to !== from)
						gen_action_space(to);
				});
			}
		}
	},
	space(to) {
		end_avoid_battle_success(to);
	},
	pass() {
		log(`${game.active} decline to avoid battle`);
		end_avoid_battle();
	},
}

function end_avoid_battle_success(to) {
	let who = avoiding_piece();
	console.log("AVOID BATTLE SUCCESS " + piece_name(who) + " TO " + space_name(to));
	move_piece_to(who, to);
	end_avoid_battle();
}

function end_avoid_battle() {
	let who = avoiding_piece();
	if (who)
		unstack_force(who);
	console.log("END AVOID BATTLE");
	set_enemy_active('move');
	goto_battle_check();
}

// BATTLE

function for_each_attacking_piece(fn) {
	game.battle.atk_pcs.forEach(fn);
}

function count_attacking_units() {
	let n = 0;
	for (let i = 0; i < game.battle.atk_pcs.length; ++i)
		if (is_unit(game.battle.atk_pcs[i]))
			++n;
	return n;
}

function for_each_defending_piece(fn) {
	let where = game.battle.where;
	if (game.battle.assault) {
		if (game.battle.defender === BRITAIN) {
			for (let p = first_british_piece; p <= last_british_piece; ++p)
				if (is_piece_in_space(p, where))
					fn(p);
		} else {
			for (let p = first_french_piece; p <= last_french_piece; ++p)
				if (is_piece_in_space(p, where))
					fn(p);
		}
	} else {
		if (game.battle.defender === BRITAIN) {
			for (let p = first_british_piece; p <= last_british_piece; ++p)
				if (is_piece_unbesieged(p) && is_piece_in_space(p, where))
					fn(p);
		} else {
			for (let p = first_french_piece; p <= last_french_piece; ++p)
				if (is_piece_unbesieged(p) && is_piece_in_space(p, where))
					fn(p);
		}
	}
}

function some_attacking_piece(fn) {
	let r = false;
	for_each_attacking_piece(p => { if (fn(p)) r = true });
	return r;
}

function some_defending_piece(fn) {
	let r = false;
	for_each_defending_piece(p => { if (fn(p)) r = true });
	return r;
}

function attacker_combat_strength() {
	let str = 0;
	for_each_attacking_piece(p => {
		if (is_unit(p))
			str += unit_strength(p);
	});
	return str;
}

function defender_combat_strength() {
	let str = 0;
	for_each_defending_piece(p => {
		if (is_unit(p))
			str += unit_strength(p);
	});
	return str;
}

const COMBAT_RESULT_TABLE = [
	// S/D  0  1  2  3  4  5  6  7
	[  0, [ 0, 0, 0, 0, 0, 1, 1, 1 ]],
	[  1, [ 0, 0, 0, 0, 1, 1, 1, 1 ]],
	[  2, [ 0, 0, 0, 1, 1, 1, 1, 2 ]],
	[  3, [ 0, 0, 1, 1, 1, 1, 2, 2 ]],
	[  5, [ 0, 0, 1, 1, 2, 2, 2, 3 ]],
	[  8, [ 0, 1, 2, 2, 2, 3, 3, 3 ]],
	[ 12, [ 1, 2, 2, 2, 3, 3, 4, 4 ]],
	[ 16, [ 1, 2, 3, 3, 4, 4, 4, 5 ]],
	[ 21, [ 2, 3, 3, 4, 4, 5, 5, 6 ]],
	[ 27, [ 3, 4, 4, 4, 5, 5, 6, 7 ]],
	[ 1000, [ 3, 4, 5, 5, 6, 6, 7, 8 ]],
]

function combat_result(die, str, shift) {
	die = clamp(die, 0, 7);
	str = clamp(str, 0, 28);
	for (let i = 0; i < COMBAT_RESULT_TABLE.length; ++i) {
		if (str <= COMBAT_RESULT_TABLE[i][0]) {
			let k = clamp(i + shift, 0, COMBAT_RESULT_TABLE.length-1);
			let r = COMBAT_RESULT_TABLE[k][1][die];
			if (k === 0)
				log(`Lookup ${die} on column 0: ${r}.`);
			else if (k === COMBAT_RESULT_TABLE.length - 1)
				log(`Lookup ${die} on column >= 28: ${r}.`);
			else {
				let a = COMBAT_RESULT_TABLE[k-1][0] + 1;
				let b = COMBAT_RESULT_TABLE[k][0];
				if (a === b)
					log(`Lookup ${die} on column ${b}: ${r}.`);
				else
					log(`Lookup ${die} on column ${a}-${b}: ${r}.`);
			}
			return r;
		}
	}
	return NaN;
}

function goto_battle(where, is_assault) {
	clear_undo();

	log("");
	log("BATTLE IN " + space_name(where));

	game.battle = {
		where: where,
		attacker: game.active,
		defender: enemy(),
		assault: is_assault,
		atk_worth_vp: 0,
		def_worth_vp: 0,
		atk_pcs: [],
	};

	// Make a list of attacking pieces (for sorties and so we can unstack from the leader box)
	if (game.battle.assault) {
		game.battle.atk_commander = find_friendly_commanding_leader_in_space(game.battle.where);
		let where = game.battle.where;
		if (game.battle.attacker === BRITAIN) {
			for (let p = first_british_piece; p <= last_british_piece; ++p)
				if (is_piece_in_space(p, where))
					game.battle.atk_pcs.push(p);
		} else {
			for (let p = first_french_piece; p <= last_french_piece; ++p)
				if (is_piece_in_space(p, where))
					game.battle.atk_pcs.push(p);
		}
	} else if (game.raid) {
		game.battle.atk_commander = find_friendly_commanding_leader_in_space(game.battle.where);
		for_each_friendly_piece_in_space(game.battle.where, p => {
			game.battle.atk_pcs.push(p);
		});
	} else {
		game.battle.atk_commander = game.move.moving;
		for_each_piece_in_force(game.move.moving, p => {
			game.battle.atk_pcs.push(p);
		});
	}

	// 5.36 unit or leader may not be activated if it participated in combat or assault.
	if (game.activation) {
		for_each_attacking_piece(p => {
			if (game.activation.includes(p)) {
				log(`${piece_name(p)} deactivated.`);
				remove_from_array(game.activation, p);
				unstack_force(p);
			}
		});
	}

	if (!game.battle.assault) {
		let n_atk = 0;
		for_each_attacking_piece(p => {
			if (is_unit(p))
				++n_atk;
			if (is_regulars_unit(p))
				game.battle.atk_worth_vp = 1;
		});
		if (n_atk > 4)
			game.battle.atk_worth_vp = 1;

		let n_def = 0;
		for_each_defending_piece(p => {
			if (is_unit(p))
				++n_def;
			if (is_regulars_unit(p))
				game.battle.def_worth_vp = 1;
		});
		if (n_def > 4)
			game.battle.def_worth_vp = 1;
	}

	if (game.raid)
		game.raid.battle = where;

	// No Militia take part in assaults
	if (!game.battle.assault)
		goto_battle_militia();
	else
		goto_battle_sortie();
}

function goto_battle_militia() {
	let box = department_militia(game.battle.where);
	if (box && count_militia_in_department(box) > 0) {
		console.log("MILITIA", space_name(game.battle.where), space_name(box));
		let dept = null;
		switch (box) {
		case ST_LAWRENCE_CANADIAN_MILITIAS:
			set_active(FRANCE);
			dept = departments.st_lawrence;
			break;
		case NORTHERN_COLONIAL_MILITIAS:
			set_active(BRITAIN);
			dept = departments.northern;
			break;
		case SOUTHERN_COLONIAL_MILITIAS:
			set_active(BRITAIN);
			dept = departments.southern;
			break;
		}
		// 7.3 exception: No Militia if there are enemy raided markers.
		for (let i = 0; i < dept.length; ++i)
			if (has_enemy_raided_marker(dept[i]))
				return goto_battle_sortie();
		game.state = 'militia_in_battle';
	} else {
		goto_battle_sortie();
	}
}

states.militia_in_battle = {
	prompt() {
		view.prompt = "Determine which Militia units will participate.";
		let box = department_militia(game.battle.where);
		view.where = game.battle.where;
		for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
			if (piece_node(p) === box)
				gen_action_piece(p);
		gen_action_next();
	},
	piece(p) {
		push_undo();
		log(`Deploys militia in ${space_name(game.battle.where)}.`);
		move_piece_to(p, game.battle.where);
	},
	next() {
		clear_undo();
		goto_battle_sortie();
	},
}

function goto_battle_sortie() {
	set_active(game.battle.attacker);
	if (has_besieged_friendly_units(game.battle.where) && has_unbesieged_friendly_units(game.battle.where)) {
		game.state = 'sortie';
	} else {
		goto_battle_attacker_events();
	}
}

states.sortie = {
	prompt() {
		view.prompt = "Determine which besieged units will participate in the battle.";
		view.where = game.battle.where;
		for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
			if (is_piece_in_space(p, game.battle.where) && is_piece_inside(p))
				if (!game.battle.atk_pcs.includes(p))
					gen_action_piece(p);
		gen_action_next();
	},
	piece(p) {
		push_undo();
		log(`${piece_name(p)} sorties.`);
		game.battle.atk_pcs.push(p);

		// 5.36 unit or leader may not be activated if it participated in combat or assault.
		unstack_piece_from_force(p);
		if (game.activation)
			remove_from_array(game.activation, p);
	},
	next() {
		clear_undo();
		goto_battle_attacker_events();
	},
}

function count_auxiliary_units_in_attack() {
	let n = 0;
	for_each_attacking_piece(p => {
		if (is_auxiliary_unit(p))
			++n;
	});
	return n;
}

function count_auxiliary_units_in_defense() {
	let n = 0;
	for_each_defending_piece(p => {
		if (is_auxiliary_unit(p))
			++n;
	});
	return n;
}

function has_light_infantry_in_attack() {
	let n = 0;
	for_each_attacking_piece(p => {
		if (is_light_infantry_unit(p))
			++n;
	});
	return n > 0;
}

function has_light_infantry_in_defense() {
	let n = 0;
	for_each_defending_piece(p => {
		if (is_light_infantry_unit(p))
			++n;
	});
	return n > 0;
}

function can_play_ambush_in_attack() {
	if (!game.battle.assault) {
		let s = game.battle.where;
		if (is_card_available_for_attacker(AMBUSH_1) || is_card_available_for_attacker(AMBUSH_2)) {
			let n = count_auxiliary_units_in_attack();
			if (is_wilderness_or_mountain(s) && n > 0) {
				if (has_enemy_fort(s) || has_light_infantry_in_defense(s) || count_auxiliary_units_in_defense() > n)
					return false;
				return true;
			}
		}
	}
	return false;
}

function can_play_ambush_in_defense() {
	if (!game.battle.assault) {
		let s = game.battle.where;
		if (is_card_available_for_defender(AMBUSH_1) || is_card_available_for_defender(AMBUSH_2)) {
			let n = count_auxiliary_units_in_defense();
			if (is_wilderness_or_mountain(s) && n > 0) {
				if (has_enemy_fort(s) || has_light_infantry_in_attack(s) || count_auxiliary_units_in_attack() > n)
					return false;
				return true;
			}
		}
	}
	return false;
}

function can_play_coehorns_in_attack() {
	if (is_card_available_for_attacker(COEHORNS))
		return game.battle.assault && has_friendly_regulars(game.battle.where);
	return false;
}

function can_play_fieldworks_in_attack() {
	if (!game.battle.assault) {
		if (is_card_available_for_attacker(FIELDWORKS_1) || is_card_available_for_attacker(FIELDWORKS_2)) {
			if (has_fieldworks(game.battle.where)) {
				if (game.battle.assault)
					return has_friendly_drilled_troops(game.battle.where);
				else
					return force_has_drilled_troops(game.move.moving);
			}
		}
	}
	return false;
}

function can_play_fieldworks_in_defense() {
	if (!game.battle.assault) {
		if (is_card_available_for_defender(FIELDWORKS_1) || is_card_available_for_defender(FIELDWORKS_2)) {
			if (!has_fieldworks(game.battle.where)) {
				return has_friendly_drilled_troops(game.battle.where);
			}
		}
	}
	return false;
}

function goto_battle_attacker_events() {
	set_active(game.battle.attacker);
	if (can_play_ambush_in_attack() || can_play_coehorns_in_attack() || can_play_fieldworks_in_attack()) {
		game.state = 'attacker_events';
	} else {
		goto_battle_defender_events();
	}
}

function goto_battle_defender_events() {
	set_active(game.battle.defender);
	if (can_play_ambush_in_defense() || can_play_fieldworks_in_defense()) {
		game.state = 'defender_events';
	} else {
		goto_battle_roll();
	}
}

states.attacker_events = {
	prompt() {
		view.prompt = "Attacker may play battle response cards.";
		if (can_play_ambush_in_attack()) {
			if (player.hand.includes(AMBUSH_1))
				gen_action('play_event', AMBUSH_1);
			if (player.hand.includes(AMBUSH_2))
				gen_action('play_event', AMBUSH_2);
		}
		if (can_play_coehorns_in_attack()) {
			if (player.hand.includes(COEHORNS))
				gen_action('play_event', COEHORNS);
		}
		if (can_play_fieldworks_in_attack()) {
			if (player.hand.includes(FIELDWORKS_1))
				gen_action('play_event', FIELDWORKS_1);
			if (player.hand.includes(FIELDWORKS_2))
				gen_action('play_event', FIELDWORKS_2);
		}
		gen_action_next();
	},
	play_event(c) {
		push_undo();
		play_card(c);
		switch (c) {
		case AMBUSH_1:
		case AMBUSH_2:
			game.events.ambush = game.active;
			break;
		case COEHORNS:
			game.events.coehorns = game.active;
			break;
		case FIELDWORKS_1:
		case FIELDWORKS_2:
			remove_fieldworks(game.battle.where);
			break;
		}
	},
	next() {
		clear_undo();
		goto_battle_defender_events();
	},
}

states.defender_events = {
	prompt() {
		view.prompt = "Defender may play battle response cards.";
		if (can_play_ambush_in_defense()) {
			if (player.hand.includes(AMBUSH_1))
				gen_action('play_event', AMBUSH_1);
			if (player.hand.includes(AMBUSH_2))
				gen_action('play_event', AMBUSH_2);
		}
		if (can_play_fieldworks_in_defense()) {
			if (player.hand.includes(FIELDWORKS_1))
				gen_action('play_event', FIELDWORKS_1);
			if (player.hand.includes(FIELDWORKS_2))
				gen_action('play_event', FIELDWORKS_2);
		}
		gen_action_next();
	},
	play_event(c) {
		push_undo();
		play_card(c);
		switch (c) {
		case AMBUSH_1:
		case AMBUSH_2:
			if (game.events.ambush)
				delete game.events.ambush;
			else
				game.events.ambush = game.active;
			break;
		case FIELDWORKS_1:
		case FIELDWORKS_2:
			place_fieldworks(game.battle.where);
			break;
		}
	},
	next() {
		clear_undo();
		goto_battle_roll();
	},
}

/*
	if ambush == attacker
		attacker fires
		defender step loss
		defender fires
		attacker step loss
	else if ambush === defender
		defender fires
		attacker step loss
		attacker fires
		defender step loss
	else
		attacker fires
		defender fires
		attacker step loss
		defender step loss
	determine winner
 */

function goto_battle_roll() {
	if (game.events.ambush === game.battle.attacker)
		goto_atk_fire();
	else if (game.events.ambush === game.battle.defender)
		goto_def_fire();
	else
		goto_atk_fire();
}

function end_atk_fire() {
	if (game.events.ambush)
		goto_def_step_losses();
	else
		goto_def_fire();
}

function end_def_fire() {
	goto_atk_step_losses();
}

function end_step_losses() {
	if (game.active === game.battle.attacker)
		goto_atk_leader_check();
	else
		goto_def_leader_check();
}

function end_leader_check() {
	delete game.battle.leader_check;
	if (game.events.ambush === game.battle.attacker) {
		if (game.active === game.battle.defender)
			goto_def_fire();
		else
			goto_determine_winner();
	} else if (game.events.ambush === game.battle.defender) {
		if (game.active === game.battle.attacker)
			goto_atk_fire();
		else
			goto_determine_winner();
	} else {
		if (game.active === game.battle.attacker)
			goto_def_step_losses();
		else
			goto_determine_winner();
	}
}

// FIRE

function goto_atk_fire() {
	set_active(game.battle.attacker);

	log("");
	log("ATTACKER");

	let str = attacker_combat_strength();
	let shift = 0;
	if (game.events.ambush === game.battle.attacker) {
		log(`Strength ${str} \xd7 2 for ambush.`);
		str *= 2;
	} else {
		log(`Strength ${str}.`);
	}

	let die = game.battle.atk_die = roll_die("for attacker");
	if (is_leader(game.battle.atk_commander)) {
		die = modify(die, leader_tactics(game.battle.atk_commander), "leader tactics");
	}
	if (game.events.coehorns === game.battle.attacker) {
		die = modify(die, 2, "for coehorns");
	}

	if (game.battle.assault) {
		log(`1 column left for assaulting`);
		shift -= 1;
	} else {
		if (is_wilderness_or_mountain(game.battle.where)) {
			let atk_has_ax = some_attacking_piece(p => is_auxiliary_unit(p) || is_light_infantry_unit(p));
			let def_has_ax = some_defending_piece(p => is_auxiliary_unit(p) || is_light_infantry_unit(p));
			if (!atk_has_ax && def_has_ax)
				die = modify(die, -1, "vs auxiliaries in wilderness");
		}
		if (is_cultivated(game.battle.where)) {
			let atk_has_reg = some_attacking_piece(p => is_regulars_unit(p));
			let def_has_reg = some_defending_piece(p => is_regulars_unit(p));
			if (!atk_has_reg && def_has_reg)
				die = modify(die, -1, "vs regulars in cultivated");
		}
		if (has_amphib(game.battle.where) && game.move.type === 'naval') {
			die = modify(die, -1, "amphibious landing");
		}
		if (has_enemy_stockade(game.battle.where)) {
			die = modify(die, -1, "vs stockade");
		}
		if (has_fieldworks(game.battle.where)) {
			// NOTE: Ignore fieldworks during assault, as they belong to the besieging forces.
			log(`1 column left vs fieldworks`);
			shift -= 1;
		}
	}

	game.battle.atk_result = combat_result(die, str, shift);
	log(`Attacker result: ${game.battle.atk_result}.`);

	end_atk_fire();
}

function goto_def_fire() {
	set_active(game.battle.defender);

	log("");
	log("DEFENDER");

	let str = defender_combat_strength();
	let shift = 0;
	if (game.events.ambush === game.battle.defender) {
		log(`Strength ${str} \xd7 2 for ambush.`);
		str *= 2;
	} else {
		log(`Strength ${str}.`);
	}

	let die = game.battle.def_die = roll_die("for defender");
	let p = find_friendly_commanding_leader_in_space(game.battle.where);
	if (p) {
		die = modify(die, leader_tactics(p), "leader tactics");
	}

	if (!game.battle.assault) {
		if (is_wilderness_or_mountain(game.battle.where)) {
			let atk_has_ax = some_attacking_piece(p => is_auxiliary_unit(p) || is_light_infantry_unit(p));
			let def_has_ax = some_defending_piece(p => is_auxiliary_unit(p) || is_light_infantry_unit(p));
			if (atk_has_ax && !def_has_ax)
				die = modify(die, -1, "vs auxiliaries in wilderness");
		}
		if (is_cultivated(game.battle.where)) {
			let atk_has_reg = some_attacking_piece(p => is_regulars_unit(p));
			let def_has_reg = some_defending_piece(p => is_regulars_unit(p));
			if (atk_has_reg && !def_has_reg)
				die = modify(die, -1, "vs regulars in cultivated");
		}
	}

	game.battle.def_result = combat_result(die, str, shift);
	log(`Defender result: ${game.battle.def_result}.`);

	end_def_fire();
}

// STEP LOSSES

function goto_atk_step_losses() {
	set_active(game.battle.attacker);
	if (game.battle.def_result > 0) {
		if (game.move)
			unstack_force(moving_piece());
		game.state = 'step_losses';
		game.battle.step_loss = game.battle.def_result;
		if (game.battle.assault)
			game.battle.dt_loss = game.battle.step_loss;
		else
			game.battle.dt_loss = Math.ceil(game.battle.step_loss / 2);
		game.battle.units = [];
		for_each_attacking_piece(p => {
			if (is_unit(p))
				game.battle.units.push(p);
		});
	} else {
		end_step_losses();
	}
}

function goto_def_step_losses() {
	set_active(game.battle.defender);
	if (game.battle.atk_result > 0) {
		game.state = 'step_losses';
		game.battle.step_loss = game.battle.atk_result;
		if (game.battle.assault)
			game.battle.dt_loss = game.battle.step_loss;
		else
			game.battle.dt_loss = Math.ceil(game.battle.step_loss / 2);
		game.battle.units = [];
		for_each_defending_piece(p => {
			if (is_unit(p))
				game.battle.units.push(p);
		});
	} else {
		end_step_losses();
	}
}

states.step_losses = {
	prompt() {
		view.prompt = `Apply step losses (${game.battle.step_loss} total, ${game.battle.dt_loss} from drilled troops).`;
		let can_reduce = false;
		if (game.battle.step_loss > 0) {
			if (game.battle.dt_loss > 0) {
				for (let i = 0; i < game.battle.units.length; ++i) {
					let p = game.battle.units[i];
					if (is_drilled_troops(p) && !is_unit_reduced(p)) {
						can_reduce = true;
						gen_action_piece(p);
					}
				}
				if (!can_reduce) {
					for (let i = 0; i < game.battle.units.length; ++i) {
						let p = game.battle.units[i];
						if (is_drilled_troops(p)) {
							can_reduce = true;
							gen_action_piece(p);
						}
					}
				}
			}
			if (!can_reduce) {
				for (let i = 0; i < game.battle.units.length; ++i) {
					let p = game.battle.units[i];
					if (!is_unit_reduced(p)) {
						can_reduce = true;
						gen_action_piece(p);
					}
				}
			}
			if (!can_reduce) {
				for (let i = 0; i < game.battle.units.length; ++i) {
					let p = game.battle.units[i];
					can_reduce = true;
					gen_action_piece(p);
				}
			}
		}
		if (!can_reduce)
			gen_action_next();
	},
	piece(p) {
		push_undo();
		--game.battle.step_loss;
		if (game.battle.dt_loss > 0 && is_drilled_troops(p))
			--game.battle.dt_loss;
		if (reduce_unit(p)) {
			remove_from_array(game.battle.atk_pcs, p);
			remove_from_array(game.battle.units, p);
		}
	},
	next() {
		clear_undo();
		end_step_losses();
	},
}

function goto_raid_step_losses() {
	if (game.raid.step_loss > 0) {
		game.state = 'raid_step_losses';
		game.raid.units = [];
		for_each_friendly_unit_in_space(game.raid.where, p => {
			game.raid.units.push(p);
		});
	} else {
		goto_raid_leader_check();
	}
}

states.raid_step_losses = {
	prompt() {
		view.prompt = `Apply step losses (${game.raid.step_loss}).`;
		let can_reduce = false;
		if (game.raid.step_loss > 0) {
			for (let i = 0; i < game.raid.units.length; ++i) {
				let p = game.raid.units[i];
				if (!is_unit_reduced(p)) {
					can_reduce = true;
					gen_action_piece(p);
				}
			}
			if (!can_reduce) {
				for (let i = 0; i < game.raid.units.length; ++i) {
					let p = game.raid.units[i];
					can_reduce = true;
					gen_action_piece(p);
				}
			}
		}
		if (!can_reduce)
			gen_action_next();
	},
	piece(p) {
		push_undo();
		--game.raid.step_loss;
		if (reduce_unit(p))
			remove_from_array(game.raid.units, p);
	},
	next() {
		clear_undo();
		goto_raid_leader_check();
	},
}

// LEADER LOSSES

function goto_atk_leader_check() {
	set_active(game.battle.attacker);
	game.battle.leader_check = [];
	if ((game.battle.def_result > 0) && (game.battle.def_die === 1 || game.battle.def_die === 6)) {
		log(`${game.battle.attacker} leader loss check`);
		for_each_attacking_piece(p => {
			if (is_leader(p))
				game.battle.leader_check.push(p);
		});
	}
	if (game.battle.leader_check.length > 0)
		game.state = 'leader_check';
	else
		end_leader_check();
}

function goto_def_leader_check() {
	set_active(game.battle.defender);
	game.battle.leader_check = [];
	if ((game.battle.atk_result > 0) && (game.battle.atk_die === 1 || game.battle.atk_die === 6)) {
		log(`${game.battle.defender} leader loss check`);
		for_each_defending_piece(p => {
			if (is_leader(p))
				game.battle.leader_check.push(p);
		});
	}
	if (game.battle.leader_check.length > 0)
		game.state = 'leader_check';
	else
		end_leader_check();
}

states.leader_check = {
	prompt() {
		view.prompt = "Roll for leader losses.";
		for (let i = 0; i < game.battle.leader_check.length; ++i)
			gen_action_piece(game.battle.leader_check[i]);
	},
	piece(p) {
		let die = roll_die("for leader check");
		if (die === 1) {
			log(`${piece_name(p)} rolls ${die} and is killed`);
			if (game.battle)
				remove_from_array(game.battle.atk_pcs, p);
			eliminate_piece(p);
		} else {
			log(`${piece_name(p)} rolls ${die} and survives`);
		}
		remove_from_array(game.battle.leader_check, p);
		if (game.battle.leader_check.length === 0)
			end_leader_check();
	},
}

function goto_raid_leader_check() {
	if (game.raid.leader_check) {
		game.raid.leader_check = [];
		log(`${game.active} leader loss check`);
		for_each_friendly_leader_in_space(game.raid.where, p => {
			game.raid.leader_check.push(p);
		});
		if (game.raid.leader_check.length > 0) {
			game.state = 'raid_leader_check';
		} else {
			delete game.raid.leader_check;
			raiders_go_home();
		}
	} else {
		raiders_go_home();
	}
}

states.raid_leader_check = {
	prompt() {
		view.prompt = "Roll for leader losses.";
		for (let i = 0; i < game.raid.leader_check.length; ++i)
			gen_action_piece(game.raid.leader_check[i]);
	},
	piece(p) {
		let die = roll_die("for leader check");
		if (die === 1) {
			log(`${piece_name(p)} rolls ${die} and is killed`);
			eliminate_piece(p);
		} else {
			log(`${piece_name(p)} rolls ${die} and survives`);
		}
		remove_from_array(game.raid.leader_check, p);
		if (game.raid.leader_check.length === 0) {
			delete game.raid.leader_check;
			raiders_go_home();
		}
	},
}

// WINNER/LOSER

function return_militia(where) {
	let box = department_militia(where);
	console.log("RETURN MILITIA", space_name(where), space_name(box));
	if (box) {
		let n = 0;
		for (let p = 1; p < pieces.length; ++p) {
			if (is_militia_unit(p) && is_piece_in_space(p, where)) {
				move_piece_to(p, box);
				++n;
			}
		}
		if (n > 0) {
			log(`${n} Militia units return to their box.`);
		}
	}
}

function goto_determine_winner() {
	set_active(game.battle.attacker);
	if (game.battle.assault)
		determine_winner_assault();
	else
		determine_winner_battle();
}

function determine_winner_battle() {
	let where = game.battle.where;

	log("");

	// 7.8: Determine winner
	let atk_surv = count_attacking_units();
	let def_surv = count_unbesieged_enemy_units_in_space(where);
	let victor;
	if (atk_surv === 0 && def_surv === 0)
		victor = game.battle.defender;
	else if (def_surv === 0)
		victor = game.battle.attacker;
	else if (atk_surv === 0)
		victor = game.battle.defender;
	else if (game.battle.atk_result > game.battle.def_result)
		victor = game.battle.attacker;
	else
		victor = game.battle.defender;

	if (victor === game.battle.attacker && game.battle.atk_worth_vp) {
		if (victor === FRANCE)
			award_french_vp(1);
		else
			award_british_vp(1);
	}
	if (victor === game.battle.defender && game.battle.def_worth_vp) {
		if (victor === FRANCE)
			award_french_vp(1);
		else
			award_british_vp(1);
	}

	return_militia(game.battle.where);

	if (victor === game.battle.attacker)
		remove_fieldworks(where);

	// Raid battle vs militia
	if (game.raid && game.raid.where > 0) {
		if (victor === game.battle.attacker) {
			log("ATTACKER WON RAID BATTLE VS MILITIA");
			goto_raid_events();
		} else {
			log("DEFENDER WON RAID BATTLE VS MILITIA");
			if (game.battle.atk_pcs.length > 0)
				retreat_attacker(game.raid.where, game.raid.from[game.raid.where] | 0);
			else
				end_retreat_attacker(game.raid.from[game.raid.where]);
		}
		return;
	}

	// TODO: Breakout (<-- forgot why this TODO item is here)

	// Normal battle
	if (victor === game.battle.attacker)
		log("ATTACKER WON");
	else
		log("DEFENDER WON");

	// 6.712 - Infiltrator must always retreat from fort/fortress even if they win
	if (game.move.infiltrated && has_unbesieged_enemy_fort_or_fortress(game.battle.where))
		victor = game.battle.defender;

	if (victor === game.battle.attacker) {
		if (has_unbesieged_enemy_units(where)) {
			goto_retreat_defender();
		} else {
			if (def_surv === 0 && game.battle.def_result === 0) {
				log("OVERRUN");
				end_move_step(false);
			} else {
				end_move_step(true);
			}
		}
	} else {
		if (game.battle.atk_pcs.length > 0) {
			unstack_force(moving_piece());
			retreat_attacker(game.battle.where, moving_piece_came_from());
		} else {
			end_retreat_attacker(moving_piece_came_from());
		}
	}
}

function eliminate_enemy_pieces_inside(where) {
	for (let p = first_enemy_piece; p <= last_enemy_piece; ++p)
		if (is_piece_in_space(p, where) && is_piece_inside(p))
			eliminate_piece(p);
}

function determine_winner_assault() {
	let where = game.battle.where;
	let victor;

	log("");

	if (game.battle.atk_result > game.battle.def_result)
		victor = game.battle.attacker;
	else
		victor = game.battle.defender;

	// TODO: does defender win if attacker is eliminated

	if (victor === game.battle.attacker) {
		log("ATTACKER WON ASSAULT");
		eliminate_enemy_pieces_inside(where);
		remove_siege_marker(where);
		remove_fieldworks(where);
		if (has_enemy_fortress(where)) {
			capture_enemy_fortress(where);
			if (can_play_massacre())
				return goto_massacre('massacre_after_assault');
		}
		if (has_enemy_fort(where)) {
			capture_enemy_fort(where);
			if (can_play_massacre())
				return goto_massacre('massacre_after_assault');
		}
	} else {
		log("DEFENDER WON ASSAULT");
	}

	end_move_step(true);
}

states.massacre_after_assault = {
	prompt: massacre_prompt,
	play_event(c) {
		massacre_play(c);
		end_move_step(true);
	},
	next() {
		set_active(enemy());
		end_move_step(true);
	}
}

// RETREAT

function can_attacker_retreat_from_to(p, from, to) {
	console.log("RETREAT QUERY (ATTACK)", piece_name(p), space_name(from), space_name(to));
	if (to === 0)
		return false;
	if (has_unbesieged_enemy_units(to))
		return false;
	if (has_unbesieged_enemy_fortifications(to))
		return false;
	if (force_has_drilled_troops(p)) {
		if (is_cultivated(to) || has_friendly_fortifications(to))
			return true;
		else
			return false;
	}
	return true;
}

function retreat_attacker(from, to) {
	set_active(game.battle.attacker);
	game.state = 'retreat_attacker';
	game.retreat = { from, to };
}

states.retreat_attacker = {
	prompt() {
		let from = game.retreat.from;
		let to = game.retreat.to;
		if (from === to)
			view.prompt = `Retreat losing leaders and units back into ${space_name(to)}.`;
		else
			view.prompt = `Retreat losing leaders and units from ${space_name(from)} to ${space_name(to)}.`;
		view.where = from;
		gen_action_space(to);
	},
	space(_) {
		let from = game.retreat.from;
		let to = game.retreat.to;
		delete game.retreat;

		console.log("RETREAT ATTACKER", space_name(from), "to", space_name(to));

		// NOTE: Besieged pieces that sortie out are 'inside' so not affected by the code below.
		for_each_friendly_piece_in_space(from, p => {
			if (!is_piece_inside(p)) {
				if (can_attacker_retreat_from_to(p, from, to))
					move_piece_to(p, to);
				else
					eliminate_piece(p);
			}
		});

		end_retreat_attacker(to);
	}
}

function end_retreat_attacker(to) {
	if (game.move)
		game.move.infiltrated = 0;

	// Raid battle vs militia
	if (game.raid && game.raid.where > 0) {
		// if raiders need to retreat again, they go back to this
		// space, unless they retreat to join other raiders
		if (!game.raid.from[to])
			game.raid.from[to] = from;
		return goto_pick_raid();
	}

	// Normal battle
	end_retreat();
}

function goto_retreat_defender() {
	set_active(game.battle.defender);
	game.state = 'retreat_defender';
}

function can_defender_retreat_from_to(p, from, to) {
	console.log("RETREAT QUERY", piece_name(p), space_name(from), space_name(to), "atk came from", moving_piece_came_from());
	if (has_unbesieged_enemy_units(to))
		return false;
	if (has_unbesieged_enemy_fortifications(to))
		return false;
	if (moving_piece_came_from() === to)
		return false;
	if (force_has_drilled_troops(p)) {
		if (is_cultivated(to) || has_friendly_fortifications(to))
			return true;
		else
			return false;
	}
	return true;
}

function can_defender_retreat_inside(p, from) {
	if (has_friendly_fort_or_fortress(from)) {
		let n = count_friendly_units_inside(from);
		let m = count_units_in_force(p);
		if (is_leader(p) || is_fortress(from) || (n + m) <= 4)
			return true;
	}
	return false;
}

function can_defender_retreat_from(p, from) {
	if (is_piece_inside(p))
		return false;
	if (can_defender_retreat_inside(p, from))
		return true;
	if (game.battle.defender === BRITAIN && has_amphib(from))
		return true;
	let can_retreat = false;
	for_each_exit(from, to => {
		if (can_defender_retreat_from_to(p, from, to))
			can_retreat = true;
	});
	return can_retreat;
}

// TODO: auto-select pieces to retreat?
states.retreat_defender = {
	prompt() {
		let from = battle_space();
		view.prompt = "Retreat losing leaders and units \u2014";
		view.where = from;
		let can_retreat = false;
		for_each_friendly_piece_in_node(from, p => {
			if (can_defender_retreat_from(p, from)) {
				console.log(piece_name(p) + " CAN RETREAT");
				can_retreat = true;
				gen_action_piece(p);
			}
			else
				console.log(piece_name(p) + " CANNOT RETREAT");
		});
		if (!can_retreat) {
			view.prompt += " done.";
			gen_action_next();
		} else {
			view.prompt += " select piece to retreat.";
		}
	},
	piece(piece) {
		push_undo();
		game.battle.who = piece;
		game.state = 'retreat_defender_to';
	},
	next() {
		clear_undo();
		let from = battle_space();
		for_each_friendly_piece_in_space(from, p => {
			if (!is_piece_inside(p))
				eliminate_piece(p);
		});
		end_retreat();
	},
}

states.retreat_defender_to = {
	prompt() {
		let from = battle_space();
		let who = game.battle.who;
		view.prompt = "Retreat losing leaders and units \u2014 select destination.";
		view.who = who;
		if (game.active === BRITAIN && has_amphib(from)) {
			for_each_british_controlled_port(to => gen_action_space(to));
		}
		if (can_defender_retreat_inside(who, from))
			gen_action_space(from);
		for_each_exit(from, to => {
			if (can_defender_retreat_from_to(who, from, to)) {
				gen_action_space(to);
			}
		});
	},
	space(to) {
		let from = battle_space();
		let who = game.battle.who;
		if (from === to) {
			log("retreats inside fortification");
			set_force_inside(who);
		} else {
			log("retreats to " + space_name(to));
			move_piece_to(who, to);
		}
		game.state = 'retreat_defender';
	},
}

function end_retreat() {
	set_active(game.battle.attacker);
	end_move_step(true);
}

function goto_retreat_lone_leader() {
	clear_undo();
	set_active(enemy());
	game.state = 'retreat_lone_leader';
}

function pick_unbesieged_leader(s) {
	for (let p = first_friendly_leader; p <= last_friendly_leader; ++p)
		if (is_piece_in_space(p, s) && !is_piece_inside(p))
			return p;
	return 0;
}

states.retreat_lone_leader = {
	prompt() {
		let from = moving_piece_space();
		let who = pick_unbesieged_leader(from);
		view.prompt = `Retreat lone leader ${piece_name(who)} from ${space_name(from)}.`;
		view.who = who;
		let can_retreat = false;
		if (game.active === BRITAIN && has_amphib(from)) {
			for_each_british_controlled_port(to => {
				can_retreat = true;
				gen_action_space(to)
			});
		}
		if (can_defender_retreat_inside(who, from)) {
			can_retreat = true;
			gen_action_space(from);
		}
		for_each_exit(from, to => {
			if (can_defender_retreat_from_to(who, from, to)) {
				can_retreat = true;
				gen_action_space(to);
			}
		});
		if (!can_retreat)
			gen_action('eliminate');
	},
	eliminate() {
		let from = moving_piece_space();
		let who = pick_unbesieged_leader(from);
		eliminate_piece(who);
		resume_retreat_lone_leader(from);
	},
	space(to) {
		let from = moving_piece_space();
		let who = pick_unbesieged_leader(from);
		if (from === to) {
			log("retreats inside fortification");
			set_force_inside(who);
		} else {
			log("retreats to " + space_name(to));
			move_piece_to(who, to);
		}
		resume_retreat_lone_leader(from);
	},
}

function resume_retreat_lone_leader(from) {
	let who = pick_unbesieged_leader(from);
	if (!who) {
		set_active(enemy());
		resume_move();
	}
}

// SIEGE

const SIEGE_TABLE = [ 0, 0, 0, 1, 1, 1, 2, 2 ];

function can_moving_force_siege_or_assault() {
	let leader = moving_piece();
	let space = piece_space(leader);
	if (has_besieged_enemy_fortifications(space)) {
		let commanding = find_friendly_commanding_leader_in_space(space);
		if (leader === commanding && has_friendly_supplied_drilled_troops(space)) {
			return true;
		}
	}
	return false;
}

function can_play_coehorns_in_siege(space) {
	return is_friendly_card_available(COEHORNS) && has_friendly_regulars(space);
}

function goto_siege(space) {
	clear_undo();
	game.siege_where = space;
	if (can_play_coehorns_in_siege(game.siege_where))
		game.state = 'siege_coehorns_attacker';
	else
		end_siege_coehorns_attacker();
}

states.siege_coehorns_attacker = {
	prompt() {
		if (player.hand.includes(COEHORNS)) {
			view.prompt = `Siege in ${space_name(game.siege_where)}. You may play "Coehorns & Howitzers".`;
			gen_action('play_event', COEHORNS);
		} else {
			view.prompt = `Siege in ${space_name(game.siege_where)}. You don't have "Coehorns & Howitzers".`;
		}
		gen_action_pass();
	},
	play_event(c) {
		play_card(c);
		game.events.coehorns = game.active;
		end_siege_coehorns_attacker();
	},
	pass() {
		end_siege_coehorns_attacker();
	}
}

function end_siege_coehorns_attacker() {
	set_active(enemy());
	if (can_play_coehorns_in_siege(game.siege_where))
		game.state = 'siege_coehorns_defender';
	else
		end_siege_coehorns_defender();
}

states.siege_coehorns_defender = {
	prompt() {
		if (player.hand.includes(COEHORNS)) {
			view.prompt = `Siege in ${space_name(game.siege_where)}. You may play "Coehorns & Howitzers".`;
			gen_action('play_event', COEHORNS);
		} else {
			view.prompt = `Siege in ${space_name(game.siege_where)}. You don't have "Coehorns & Howitzers".`;
		}
		gen_action_pass();
	},
	play_event(c) {
		play_card(c);
		game.events.coehorns = game.active;
		end_siege_coehorns_defender();
	},
	pass() {
		end_siege_coehorns_defender();
	}
}

function end_siege_coehorns_defender() {
	set_active(enemy());
	if (is_friendly_card_available(SURRENDER)) {
		if (game.siege_where === LOUISBOURG && game.sieges[LOUISBOURG] !== 1 && game.sieges[LOUISBOURG] !== 2)
			resolve_siege();
		else
			game.state = 'siege_surrender';
	} else {
		resolve_siege();
	}
}

states.siege_surrender = {
	prompt() {
		if (player.hand.includes(SURRENDER)) {
			view.prompt = `Siege in ${space_name(game.siege_where)}. You may play "Surrender!".`;
			gen_action('play_event', SURRENDER);
		} else {
			view.prompt = `Siege in ${space_name(game.siege_where)}. You don't have "Surrender!".`;
		}
		gen_action_pass();
	},
	play_event(c) {
		play_card(c);
		goto_surrender();
	},
	pass() {
		resolve_siege();
	}
}

function goto_surrender() {
	for (let p = first_enemy_piece; p <= last_enemy_piece; ++p)
		if (piece_node(p) === game.siege_where)
			set_piece_outside(p);
	delete game.sieges[game.siege_where];
	if (has_enemy_fort(game.siege_where))
		capture_enemy_fort_intact(game.siege_where);
	else
		capture_enemy_fortress(game.siege_where);
	if (can_play_massacre())
		return goto_massacre('massacre_after_surrender');
	goto_surrender_place();
}

states.massacre_after_surrender = {
	prompt: massacre_prompt,
	play_event(c) {
		massacre_play(c);
		goto_surrender_place();
	},
	next() {
		set_active(enemy());
		goto_surrender_place();
	}
}

function goto_surrender_place() {
	set_active(enemy());
	game.state = 'surrender';
	game.surrender = find_closest_friendly_unbesieged_fortification(game.siege_where);
}

states.surrender = {
	prompt() {
		view.prompt = "Surrender - place defenders at the closest unbesieged fortification.";
		view.where = game.siege_where;
		for (let i=0; i < game.surrender.length; ++i)
			gen_action_space(game.surrender[i]);
	},
	space(s) {
		for (let p = first_friendly_piece; p <= last_friendly_piece; ++p)
			if (piece_node(p) === game.siege_where)
				move_piece_to(p, s);
		end_surrender();
	}
}

function end_surrender() {
	set_active(enemy());
	delete game.surrender;
	delete game.siege_where;
	end_activation();
}

function resolve_siege() {
	let space = game.siege_where;
	log("Resolve siege in " + space_name(space));
	let att_leader = find_friendly_commanding_leader_in_space(space);
	let def_leader = find_enemy_commanding_leader_in_space(space);
	let die = roll_die("for siege");
	die = modify(die, leader_tactics(att_leader), "besieging leader");
	if (def_leader)
		die = modify(die, -leader_tactics(def_leader), "defending leader");
	if (space === LOUISBOURG)
		die = modify(die, -1, "for Louisbourg");
	let result = SIEGE_TABLE[clamp(die, 0, 7)];
	log(`Result(${die}): ${result}`);
	if (result > 0) {
		let level = change_siege_marker(space, result);
		log("Siege level is " + level);
	}
	goto_assault_possible(space);
}

// ASSAULT

function is_assault_possible(space) {
	let siege_level = game.sieges[space] | 0;
	if (has_enemy_fort(space) && siege_level >= 1)
		return true;
	if (has_enemy_fortress(space) && siege_level >= 2)
		return true;
	return false;
}

function goto_assault_possible(space) {
	if (is_assault_possible(space)) {
		game.state = 'assault_possible';
		game.assault_possible = space;
	} else {
		end_activation();
	}
}

states.assault_possible = {
	prompt() {
		view.prompt = "Assault is possible.";
		gen_action_space(game.assault_possible);
		gen_action('assault');
		gen_action('pass');
	},
	space() {
		let where = game.assault_possible;
		delete game.assault_possible;
		goto_assault(where);
	},
	assault() {
		let where = game.assault_possible;
		delete game.assault_possible;
		goto_assault(where);
	},
	pass() {
		let where = game.assault_possible;
		delete game.assault_possible;
		log("Does not assault " + space_name(where));
		end_activation();
	},
}

function goto_assault(where) {
	log("Assault " + space_name(where));
	goto_battle(where, true);
}

// RAID

function goto_pick_raid() {
	if (game.raid.list.length > 0) {
		clear_undo();
		game.state = 'pick_raid';
	} else {
		delete game.raid;
		// TODO: allow demolish before ending activation
		end_activation();
	}
}

states.pick_raid = {
	prompt() {
		view.prompt = "Pick next raid space.";
		for (let i=0; i < game.raid.list.length; ++i)
			gen_action_space(game.raid.list[i]);
	},
	space(s) {
		log("raids " + space_name(s))
		game.raid.where = s;
		remove_from_array(game.raid.list, s);
		goto_raid_militia();
	},
}

function goto_raid_militia() {
	let where = game.raid.where;
	if (has_enemy_stockade(where) && enemy_department_has_at_least_n_militia(where, 1)) {
		console.log("MILITIA AGAINST RAID", space_name(where), space_name(game.raid.battle));
		if (where === game.raid.battle) {
			console.log("BATTLED AGAINST STOCKADE, NO MILITIA ALLOWED", space_name(game.raid.battle));
			goto_raid_events();
		} else {
			set_active(enemy());
			game.state = 'militia_against_raid';
			game.count = 1;
		}
	} else {
		goto_raid_events();
	}
}

states.militia_against_raid = {
	prompt() {
		view.prompt = `You may deploy one Militia unit against the raid in ${space_name(game.raid.where)}.`;
		view.where = game.raid.where;
		if (game.count > 0) {
			let box = department_militia(game.raid.where);
			for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
				if (piece_node(p) === box)
					gen_action_piece(p);
		}
		gen_action_next();
	},
	piece(p) {
		push_undo();
		log(`Deploys militia in ${space_name(game.raid.where)}.`);
		move_piece_to(p, game.raid.where);
		game.count --;
	},
	next() {
		clear_undo();
		set_active(enemy());
		if (game.count === 0)
			goto_battle(game.raid.where, false);
		else
			goto_raid_events();
	},
}

const RAID_TABLE = {
	stockade:   [  2, 1, 1, 0, 2, 1, 0, 0 ],
	cultivated: [  2, 0, 0, 0, 1, 1, 0, 0 ],
};

function goto_raid_events() {
	if (is_enemy_card_available(BLOCKHOUSES)) {
		set_active(enemy());
		game.state = 'raid_blockhouses';
	} else {
		resolve_raid();
	}
}

states.raid_blockhouses = {
	prompt() {
		if (player.hand.includes(BLOCKHOUSES)) {
			view.prompt = `Raid in ${space_name(game.raid.where)}. You may play "Blockhouses".`;
			gen_action('play_event', BLOCKHOUSES);
		} else {
			view.prompt = `Raid in ${space_name(game.raid.where)}. You don't have "Blockhouses".`;
		}
		gen_action_pass();
	},
	play_event(c) {
		play_card(c);
		game.events.blockhouses = game.active;
		set_active(enemy());
		resolve_raid();
	},
	pass() {
		set_active(enemy());
		resolve_raid();
	}
}

function resolve_raid() {
	let where = game.raid.where;
	let x_stockade = has_enemy_stockade(where);
	let x_allied = has_enemy_allied_settlement(where);

	let natural_die = roll_die("for raid");
	let die = natural_die;

	// TODO: only use leader that could command the force (johnson & indians, activation limit, etc?)
	let commander = find_friendly_commanding_leader_in_space(where);
	if (commander)
		die = modify(die, leader_tactics(commander), "leader");
	if (has_friendly_rangers(where))
		die = modify(die, 1, "for rangers");
	if (enemy_department_has_at_least_n_militia(where, 2))
		die = modify(die, -1, "for milita in dept");

	let column = 'cultivated';
	if (x_stockade || x_allied)
		column = 'stockade';
	if (game.events.blockhouses === enemy()) {
		column = 'stockade';
		log("vs enemy blockhouses");
	}

	let result = clamp(die, 0, 7);
	let success = result >= 5;
	let losses = RAID_TABLE[column][result];

	if (success) {
		log(`Result ${die} vs ${column}: Success with ${losses} losses.`);
		if (x_stockade || x_allied || !has_friendly_raided_marker(where))
			place_friendly_raided_marker(where);
		if (x_stockade)
			eliminate_enemy_stockade_in_raid(where);
		if (x_allied)
			eliminate_indian_tribe(indian_tribe[where]);
	} else {
		log(`Result ${die} vs ${column}: Failure with ${losses} losses.`);
	}

	game.raid.step_loss = losses;

	// 10.32: leader check
	if (natural_die === 1 || (natural_die === 6 && column === 'vs_stockade'))
		game.raid.leader_check = 1;
	else
		game.raid.leader_check = 0;

	// Next states:
	//   raider step losses
	//   raider leader check
	//   raiders go home

	goto_raid_step_losses();
}

function next_raider_in_space(from) {
	for (let p = first_friendly_piece; p <= last_friendly_piece; ++p) {
		if (is_piece_in_space(p, from)) {
			return p;
		}
	}
	return 0;
}

function raiders_go_home() {
	// Leaders, coureurs and rangers go to nearest fortification
	// TODO: 10.413 Leaders and coureurs may follow Indians
	// Indians may follow leader
	// Indians go to home settlement

	let from = game.raid.where;
	let x_leader = find_friendly_commanding_leader_in_space(from);
	let x_rangers = has_friendly_rangers(from);
	let x_coureurs = has_friendly_coureurs(from);

	game.go_home = {
		who: next_raider_in_space(from),
	};

	if (x_leader || x_rangers || x_coureurs) {
		game.go_home.closest = find_closest_friendly_unbesieged_fortification(from);
		if (x_leader)
			game.go_home.leader = [];
	}

	game.state = 'raiders_go_home';
}

states.raiders_go_home = {
	prompt() {
		let who = game.go_home.who;

		if (who)
			view.prompt = "Raiders go home \u2014 " + piece_name(who) + ".";
		else
			view.prompt = "Raiders go home \u2014 done.";
		view.who = who;

		if (!who) {
			gen_action('next');
		} else if (is_indian_unit(who)) {
			// 10.412: Cherokee have no home settlement (home=0)
			let home = indian_home_settlement(who);
			if (home && has_friendly_allied_settlement(home) && !has_enemy_units(home))
				gen_action_space(home);
			else
				gen_action('eliminate');

			// 10.422: Indians stacked with a leader may accompany him
			if (game.go_home.leader)
				for (let i=0; i < game.go_home.leader.length; ++i)
					gen_action_space(game.go_home.leader[i]);
		} else {
			for (let i=0; i < game.go_home.closest.length; ++i)
				gen_action_space(game.go_home.closest[i]);
		}
	},
	space(s) {
		push_undo();
		let who = game.go_home.who;
		log(`${piece_name(who)} goes home to ${space_name(s)}.`);
		move_piece_to(who, s);
		if (is_leader(who) && !game.go_home.leader.includes(s))
			game.go_home.leader.push(s);
		game.go_home.who = next_raider_in_space(game.raid.where);
	},
	eliminate() {
		push_undo();
		eliminate_piece(game.go_home.who);
		game.go_home.who = next_raider_in_space(game.raid.where);
	},
	next() {
		delete game.go_home;
		goto_pick_raid();
	}
}

// LATE SEASON - INDIANS AND LEADERS GO HOME

function goto_indians_and_leaders_go_home() {
	set_active(FRANCE);
	game.state = 'indians_and_leaders_go_home';
	game.go_home = {
		indians: {}
	};
	resume_indians_and_leaders_go_home();
	if (!game.go_home.who)
		end_indians_and_leaders_go_home();
}

function resume_indians_and_leaders_go_home() {
	let who = game.go_home.who = next_indian_and_leader_to_go_home();
	if (who && is_leader(who))
		game.go_home.closest = find_closest_friendly_unbesieged_fortification(piece_space(who));
}

function end_indians_and_leaders_go_home() {
	clear_undo();
	if (game.active === FRANCE) {
		set_active(BRITAIN);
		resume_indians_and_leaders_go_home();
		if (!game.go_home.who)
			end_indians_and_leaders_go_home();
	} else {
		set_active(FRANCE);
		delete game.go_home;
		goto_remove_raided_markers();
	}
}

function next_indian_and_leader_to_go_home() {
	// Indians go home first
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p) {
		if (is_indian_unit(p) && !is_piece_inside(p)) {
			let s = piece_space(p);
			if (s && s != indian_home_settlement(p) && !has_unbesieged_friendly_fortifications(s))
				return p;
		}
	}

	// Then leaders who are left alone in the wilderness
	for (let p = first_friendly_leader; p <= last_friendly_leader; ++p) {
		if (!is_piece_inside(p)) {
			let s = piece_space(p);
			if (s && is_wilderness_or_mountain(s) && !has_friendly_units(s) && !has_unbesieged_friendly_fortifications(s))
				return p;
		}
	}
}

states.indians_and_leaders_go_home = {
	prompt() {
		let who = game.go_home.who;

		if (who)
			view.prompt = "Indians and leaders go home \u2014 " + piece_name(who) + ".";
		else
			view.prompt = "Indians and leaders go home \u2014 done.";
		view.who = who;

		if (!who) {
			gen_action('next');
		} else if (is_indian_unit(who)) {
			// 10.412: Cherokee have no home settlement (home=0)
			let home = indian_home_settlement(who);
			if (home && has_friendly_allied_settlement(home) && !has_enemy_units(home))
				gen_action_space(home);
			else
				gen_action('eliminate');
		} else {
			let from = piece_space(who);
			game.go_home.closest.forEach(gen_action_space);
			if (from in game.go_home.indians)
				game.go_home.indians[from].forEach(gen_action_space);
		}
	},
	space(s) {
		push_undo();
		let who = game.go_home.who;
		if (is_indian_unit(who)) {
			let from = piece_space(who);
			if (!(s in game.go_home.indians))
				game.go_home.indians[from] = [];
			game.go_home.indians[from].push(s);
		}
		log(`${piece_name(who)} goes home to ${space_name(s)}.`);
		move_piece_to(who, s);
		resume_indians_and_leaders_go_home();
	},
	eliminate() {
		push_undo();
		eliminate_piece(game.go_home.who);
		resume_indians_and_leaders_go_home();
	},
	next() {
		end_indians_and_leaders_go_home();
	}
}

// LATE SEASON - REMOVE RAIDED MARKERS

function goto_remove_raided_markers() {
	if (game.France.raids.length > 0) {
		log("");
		log(`France removes ${game.France.raids.length} raided markers.`);
		award_french_vp(Math.ceil(game.France.raids.length / 2));
		game.France.raids = [];
	}

	if (game.Britain.raids.length > 0) {
		log("");
		log(`Britain removes ${game.Britain.raids.length} raided markers.`);
		award_british_vp(Math.ceil(game.Britain.raids.length / 2));
		game.Britain.raids = [];
	}

	goto_winter_attrition();
}

// LATE SEASON - WINTER ATTRITION

function goto_winter_attrition() {
	set_active(FRANCE);
	game.state = 'winter_attrition';
	resume_winter_attrition();
}

function resume_winter_attrition() {
	let done = true;
	game.winter_attrition = {};
	for (let s = 1; s < spaces.length; ++s) {
		if (has_friendly_drilled_troops(s)) {
			let safe = false;
			if (is_originally_friendly(s))
				safe = true;
			if (has_friendly_fortress(s))
				safe = true;
			if (has_friendly_fort(s) || has_friendly_stockade(s))
				if (count_friendly_units_in_space(s) <= 4)
					safe = true;
			let stack = { n: 0, dt: [] };
			for_each_friendly_unit_in_space(s, p => {
				if (is_drilled_troops(p)) {
					if (is_piece_inside(p) || !safe) {
						stack.dt.push(p);
						if (is_unit_reduced(p))
							stack.n++;
					}
				}
			});
			if (stack.dt.length > 0) {
				// Never remove the last friendly step in a space.
				if (stack.n !== 1 || count_friendly_units_in_space(s) !== 1) {
					stack.n = Math.ceil(stack.n / 2);
					game.winter_attrition[s] = stack;
					done = false;
				}
			}
		}
	}
	if (done)
		end_winter_attrition();
}

function end_winter_attrition() {
	clear_undo();
	if (game.active === FRANCE) {
		set_active(BRITAIN);
		resume_winter_attrition();
	} else {
		set_active(FRANCE);
		goto_victory_check();
	}
}

states.winter_attrition = {
	prompt() {
		let done = true;
		for (let s in game.winter_attrition) {
			let stack = game.winter_attrition[s];
			for (let p of stack.dt) {
				if (is_unit_reduced(p)) {
					if (stack.n > 0) {
						done = false;
						gen_action_piece(p);
					}
				} else {
					if (stack.n === 0) {
						done = false;
						gen_action_piece(p);
					}
				}
			}
		}
		if (done) {
			view.prompt = "Winter Attrition \u2014 done.";
			gen_action_next();
		} else {
			view.prompt = "Winter Attrition.";
		}
	},
	piece(p) {
		let stack = game.winter_attrition[piece_space(p)];
		push_undo();
		if (is_unit_reduced(p))
			stack.n--;
		reduce_unit(p);
		remove_from_array(stack.dt, p);
	},
	next() {
		end_winter_attrition();
	}
}

// LATE SEASON - VICTORY CHECK

function are_all_british_controlled_spaces(list) {
	for (let i = 0; i < list.length; ++i) {
		let s = list[i];
		if (!is_british_controlled_space(s))
			return false;
	}
	return true;
}

function are_all_british_controlled_spaces_unless_besieged(list) {
	for (let i = 0; i < list.length; ++i) {
		let s = list[i];
		// TODO: 13.12 exception -- originally-British fortresses are friendly
		if (!is_british_controlled_space(s))
			return false;
	}
	return true;
}

function count_british_controlled_spaces(list) {
	let n = 0;
	for (let i = 0; i < list.length; ++i) {
		let s = list[i];
		if (is_british_controlled_space(s))
			++n;
	}
	return n;
}

function goto_victory_check() {
	if (are_all_british_controlled_spaces(fortresses) && are_all_british_controlled_spaces([NIAGARA, OHIO_FORKS]))
		return goto_game_over(BRITAIN, "Sudden Death: The British control all fortresses, Niagara, and Ohio Forks.");
	if (game.tracks.vp >= 11)
		return goto_game_over(FRANCE, "Sudden Death: France has 11 or more VP.");
	if (game.tracks.vp <= -11)
		return goto_game_over(BRITAIN, "Sudden Death: Britain has 11 or more VP.");
	if (game.tracks.year === 1760 && game.tracks.vp >= 8)
		return goto_game_over(FRANCE, "Sudden Death: France has 8 or more VP in 1760.");
	if (game.tracks.year === 1761 && game.tracks.vp >= 8)
		return goto_game_over(FRANCE, "Sudden Death: France has 5 or more VP in 1761.");
	if (game.tracks.year === game.tracks.end_year) {
		if (game.tracks.year === 1759) {
			if (are_all_british_controlled_spaces_unless_besieged(originally_british_fortresses) &&
				count_british_controlled_spaces([QUEBEC, MONTREAL, NIAGARA, OHIO_FORKS]) >= 2)
				return goto_game_over(BRITAIN, "Britain control all originally-British fortresses and two of Québec, Montréal, Niagara, and Ohio Forks.");
			if (game.tracks.vp >= 1)
				return goto_game_over(FRANCE, "France has at least 1 VP.");
			if (game.tracks.vp <= -1)
				return goto_game_over(BRITAIN, "Britain has at least 1 VP.");
		}
		if (game.tracks.year === 1762) {
			if (game.tracks.vp >= 1)
				return goto_game_over(FRANCE, "France has at least 1 VP.");
			if (game.tracks.vp <= -5)
				return goto_game_over(BRITAIN, "Britain has at least 5 VP.");
		}
		return goto_game_over(FRANCE, "Draw.");
	} else {
		game.tracks.year++;
		start_year();
	}
}

function goto_game_over(result, victory) {
	log("");
	log(victory);
	game.state = 'game_over';
	game.active = 'None';
	game.result = result;
	game.victory = victory;
}

states.game_over = {
	prompt(view) {
		return view.prompt = game.victory;
	}
}

// DEMOLITION

function gen_action_demolish() {
	for (let s of player.forts) {
		if (is_space_unbesieged(s)) {
			gen_action('demolish_fort');
			break;
		}
	}
	if (player.forts_uc.length > 0) {
		gen_action('demolish_fort');
	}
	if (player.stockades.length > 0) {
		gen_action('demolish_stockade');
	}
	for (let s of game.fieldworks) {
		if (is_friendly_controlled_space(s) || has_unbesieged_friendly_units(s)) {
			gen_action('demolish_fieldworks');
			break;
		}
	}
}

function goto_demolish_fort() {
	push_undo();
	game.demolish_state = game.state;
	game.state = 'demolish_fort';
}

function goto_demolish_stockade() {
	push_undo();
	game.demolish_state = game.state;
	game.state = 'demolish_stockade';
}

function goto_demolish_fieldworks() {
	push_undo();
	game.demolish_state = game.state;
	game.state = 'demolish_fieldworks';
}

function end_demolish() {
	game.state = game.demolish_state;
	delete game.demolish_state;
}

states.demolish_fort = {
	prompt() {
		view.prompt = "Demolish an unbesieged friendly fort.";
		for (let s of player.forts)
			if (is_space_unbesieged(s))
				gen_action_space(s);
		for (let s of player.forts_uc)
			gen_action_space(s);
	},
	space(s) {
		if (has_friendly_fort_uc(s)) {
			log(`Demolishes fort U/C at ${space_name(s)}.`);
			remove_friendly_fort_uc(s);
		} else if (has_friendly_fort(s)) {
			log(`Demolishes fort at ${space_name(s)}.`);
			award_vp(-1);
			remove_friendly_fort(s);
		}
		end_demolish();
	}
}

states.demolish_stockade = {
	prompt() {
		view.prompt = "Demolish a friendly stockade.";
		for (let s of player.stockades)
			gen_action_space(s);
	},
	space(s) {
		log(`Demolishes stockade at ${space_name(s)}.`);
		remove_friendly_stockade(s);
		end_demolish();
	}
}

states.demolish_fieldworks = {
	prompt() {
		view.prompt = "Demolish friendly fieldworks.";
		for (let s of game.fieldworks)
			if (is_friendly_controlled_space(s) || has_unbesieged_friendly_units(s))
				gen_action_space(s);
	},
	space(s) {
		remove_fieldworks(s);
		end_demolish();
	}
}

// CONSTRUCTION

function format_remain(n) {
	if (n === 0)
		return "done";
	return n + " left";
}

function goto_construct_stockades(card) {
	push_undo();
	discard_card(card, " to construct stockades");
	player.did_construct = 1;
	game.state = 'construct_stockades';
	game.count = cards[card].activation;
}

states.construct_stockades = {
	prompt() {
		view.prompt = `Construct stockades \u2014 ${format_remain(game.count)}.`;
		gen_action_next();
		if (game.count > 0) {
			for (let space = first_space; space <= last_space; ++space) {
				if (has_friendly_supplied_drilled_troops(space) || is_originally_friendly(space)) {
					if (has_enemy_units(space))
						continue;
					if (has_enemy_fortifications(space))
						continue;
					if (has_friendly_fortifications(space))
						continue;
					if (is_space_besieged(space))
						continue;
					if (is_fortress(space))
						continue;
					gen_action_space(space);
				}
			}
		}
	},
	space(space) {
		push_undo();
		log(`build a stockade in ${space_name(space)}.`);
		player.stockades.push(space);
		game.count --;
	},
	next() {
		end_action_phase();
	},
}

function goto_construct_forts(card) {
	push_undo();
	discard_card(card, " to construct forts");
	player.did_construct = 1;
	game.state = 'construct_forts';
	game.count = cards[card].activation;
	game.list = [];
}

states.construct_forts = {
	prompt() {
		view.prompt = `Construct forts \u2014 ${format_remain(game.count)}.`;
		gen_action_next();
		if (game.count > 0) {
			for (let space = first_space; space <= last_space; ++space) {
				if (has_friendly_supplied_drilled_troops(space)) {
					if (game.list.includes(space))
						continue;
					if (has_friendly_fort(space))
						continue;
					if (is_space_besieged(space))
						continue;
					if (is_fortress(space))
						continue;
					gen_action_space(space);
				}
			}
		}
	},
	space(space) {
		push_undo();
		if (has_friendly_fort_uc(space)) {
			log(`finish building a fort in ${space_name(space)}.`);
			place_friendly_fort(space);
		} else {
			log(`start building a fort in ${space_name(space)}.`);
			place_friendly_fort_uc(space);
			game.list.push(space); // don't finish it in the same action phase
		}
		game.count --;
	},
	next() {
		delete game.list;
		end_action_phase();
	},
}

// MAX TWO 7 COMMAND LEADERS

function count_7_command_leaders_in_play() {
	let n = 0;
	if (is_piece_on_map(ABERCROMBY)) ++n;
	if (is_piece_on_map(AMHERST)) ++n;
	if (is_piece_on_map(BRADDOCK)) ++n;
	if (is_piece_on_map(LOUDOUN)) ++n;
	return n;
}

function end_british_reinforcement() {
	delete game.leader;
	if (count_7_command_leaders_in_play() > 2) {
		game.state = 'max_two_7_command_leaders_in_play'
	} else {
		delete game.seven;
		end_action_phase();
	}
}

states.max_two_7_command_leaders_in_play = {
	prompt() {
		if (count_7_command_leaders_in_play() > 2) {
			view.prompt = `Remove a 7 command leader from play.`;
			if (!game.seven.includes(ABERCROMBY)) gen_action_piece(ABERCROMBY);
			if (!game.seven.includes(AMHERST)) gen_action_piece(AMHERST);
			if (!game.seven.includes(BRADDOCK)) gen_action_piece(BRADDOCK);
			if (!game.seven.includes(LOUDOUN)) gen_action_piece(LOUDOUN);
		} else {
			view.prompt = `Remove one 7 command leader from play \u2014 done.`;
			gen_action_next();
		}
	},
	piece(p) {
		push_undo();
		eliminate_piece(p);
		delete game.seven;
	},
	next() {
		end_action_phase();
	}
}


// EVENTS

function can_play_massacre() {
	let s = moving_piece_space();
	if (is_enemy_card_available(MASSACRE))
		return has_friendly_indians(s) && has_friendly_drilled_troops(s);
	return false;
}

function goto_massacre(st) {
	clear_undo();
	set_active(enemy());
	game.state = st;
}

function massacre_prompt() {
	if (player.hand.includes(MASSACRE)) {
		view.prompt = `You may play "Massacre!".`;
		gen_action('play_event', MASSACRE);
	} else {
		view.prompt = `You don't have "Massacre!".`;
	}
	gen_action_next();
}

function massacre_play(c) {
	// TODO: massacre state for manual elimination?
	play_card(c);
	let s = moving_piece_space();
	for (let p = 1; p < pieces.length; ++p)
		if (is_indian_unit(p) && is_piece_in_space(p, s))
			eliminate_piece(p);
	award_vp(1);
	set_active(enemy());
}

function can_place_in_space(s) {
	if (has_enemy_units(s))
		return false;
	if (has_enemy_fortifications(s))
		return false;
	return true;
}

function can_restore_unit(p) {
	if (is_piece_on_map(p) && is_piece_unbesieged(p) && is_unit_reduced(p)) {
		if (is_militia_unit(p))
			return true; // always in militia box
		if (is_drilled_troops(p))
			return is_in_supply(piece_space(p));
		return true;
	}
	return false;
}

function count_french_raids_in_dept(dept) {
	let n = 0;
	for (let i = 0; i < game.France.raids.length; ++i) {
		let s = game.France.raids[i];
		if (departments[dept].includes(s))
			++n;
	}
	return n;
}

events.provincial_regiments_dispersed_for_frontier_duty = {
	can_play() {
		let s = Math.min(count_french_raids_in_dept('southern'), count_provincial_units_from('southern'));
		let n = Math.min(count_french_raids_in_dept('northern'), count_provincial_units_from('northern'));
		return (s + n) > 0;
	},
	play() {
		game.state = 'provincial_regiments_dispersed_for_frontier_duty';
		game.frontier_duty = {
			southern: Math.min(count_french_raids_in_dept('southern'), count_provincial_units_from('southern')),
			northern: Math.min(count_french_raids_in_dept('northern'), count_provincial_units_from('northern')),
		};
	}
}

states.provincial_regiments_dispersed_for_frontier_duty = {
	prompt() {
		view.prompt = `Eliminate ${game.frontier_duty.southern} southern and ${game.frontier_duty.northern} northern provincials.`;
		let can_eliminate = false;
		for (let p = first_british_unit; p <= last_british_unit; ++p) {
			if ((game.frontier_duty.northern > 0 && is_provincial_unit_from(p, 'northern')) ||
				(game.frontier_duty.southern > 0 && is_provincial_unit_from(p, 'southern'))) {
				can_eliminate = true;
				gen_action_piece(p);
			}
		}
		if (!can_eliminate)
			gen_action_next();
	},
	piece(p) {
		push_undo();
		if (is_provincial_unit_from(p, 'southern'))
			game.frontier_duty.southern --;
		if (is_provincial_unit_from(p, 'northern'))
			game.frontier_duty.northern --;
		eliminate_piece(p);
	},
	next() {
		delete game.frontier_duty;
		end_action_phase();
	},
}

events.northern_indian_alliance = {
	can_play() {
		return is_friendly_controlled_space(MONTREAL);
	},
	play() {
		clear_undo(); // rolling die
		let roll = roll_die();
		if (game.tracks.vp > 4)
			game.count = roll;
		else
			game.count = Math.ceil(roll / 2);
		if (has_friendly_fort(NIAGARA))
			game.alliance = [ 'northern', 'pays-d-en-haut' ];
		else
			game.alliance = [ 'northern' ];
		game.state = 'indian_alliance';
	}
}

events.western_indian_alliance = {
	can_play() {
		return is_friendly_controlled_space(MONTREAL);
	},
	play() {
		clear_undo(); // rolling die
		let roll = roll_die();
		if (game.tracks.vp > 4)
			game.count = roll;
		else
			game.count = Math.ceil(roll / 2);
		if (has_friendly_fort(NIAGARA))
			game.alliance = [ 'western', 'pays-d-en-haut' ];
		else
			game.alliance = [ 'western' ];
		game.state = 'indian_alliance';
	}
}

events.iroquois_alliance = {
	can_play() {
		let ff =
			has_friendly_fortifications(OSWEGO) ||
			has_friendly_fortifications(ONEIDA_CARRY_WEST) ||
			has_friendly_fortifications(ONEIDA_CARRY_EAST);
		let ef =
			has_enemy_fortifications(OSWEGO) ||
			has_enemy_fortifications(ONEIDA_CARRY_WEST) ||
			has_enemy_fortifications(ONEIDA_CARRY_EAST);
		if (ff && !ef) {
			if (game.active === BRITAIN)
				return within_two_of_gray_settlement.includes(piece_space(JOHNSON));
			return true;
		}
		return false;
	},
	play() {
		clear_undo(); // rolling die
		let roll = roll_die();
		game.state = 'indian_alliance';
		game.count = roll;
		game.alliance = [ 'iroquois' ];
	},
}

function find_friendly_unused_indian(home) {
	if (home === PAYS_D_EN_HAUT) {
		for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
			if (is_pays_d_en_haut_indian_unit(p) && is_piece_unused(p))
				return p;
	} else {
		let tribe = indian_tribe[home];
		for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
			if (pieces[p].name === tribe && is_piece_unused(p))
				return p;
	}
	return 0;
}

function is_indian_alliance(p, alliance) {
	if (is_indian_unit(p))
		return pieces[p].subtype === alliance;
	return false;
}

states.indian_alliance = {
	prompt() {
		view.prompt = `Place indians at their settlements or restore to full (${game.count} left).`;
		let can_place = false;
		for (let a of game.alliance) {
			if (game.count >= 1) {
				for (let s of indian_spaces[a]) {
					if (!has_enemy_allied_settlement(s)) {
						let p = find_friendly_unused_indian(s);
						if (p && can_place_in_space(s)) {
							can_place = true;
							gen_action_space(s);
						}
					}
				}
			}
			if (game.count >= 0.5) {
				for (let p = first_friendly_unit; p <= last_friendly_unit; ++p) {
					if (is_indian_alliance(p, a)) {
						if (can_restore_unit(p)) {
							can_place = true;
							gen_action_piece(p);
						}
					}
				}
			}
		}
		if (!can_place)
			gen_action_next();
	},
	space(s) {
		push_undo();
		let p = find_friendly_unused_indian(s);
		if (p) {
			place_piece(p, s);
			game.count -= 1.0;
		}
	},
	piece(p) {
		push_undo();
		restore_unit(p);
		game.count -= 0.5;
	},
	next() {
		delete game.alliance;
		end_action_phase();
	},
}

// Used by Mohawks and Cherokees events.
function place_and_restore_british_indian_tribe(s, tribe) {
	push_undo();

	// TODO: restore_mohawks/cherokee state for manual restoring?

	// OPTIMIZE: use mohawks piece list
	for (let p = first_british_unit; p <= last_british_unit; ++p) {
		if (is_indian_tribe(p, tribe)) {
			if (is_piece_unused(p))
				place_piece(p, s);
			if (can_restore_unit(p))
				restore_unit(p);
		}
	}

	game.count = 0;
}

events.mohawks = {
	can_play() {
		let s = piece_space(JOHNSON);
		if (within_two_of_canajoharie.includes(s))
			if (is_piece_unbesieged(JOHNSON))
				return true;
		return false;
	},
	play() {
		game.state = 'mohawks';
		game.count = 1;
	},
}

states.mohawks = {
	prompt() {
		view.prompt = "Place all Mohawk units not on the map with Johnson.";
		let can_place = false;
		if (game.count > 0) {
			let s = piece_space(JOHNSON);
			if (can_place_in_space(s)) {
				can_place = true;
				gen_action_space(s);
			}
		}
		if (!can_place)
			gen_action_next();
	},
	space(s) {
		place_and_restore_british_indian_tribe(s, 'Mohawk');
	},
	next() {
		end_action_phase();
	},
}

events.cherokees = {
	can_play() {
		if (game.events.cherokee_uprising)
			return false;
		return true;
	},
	play() {
		game.events.cherokees = 1;
		game.state = 'cherokees';
		game.count = 1;
	},
}

states.cherokees = {
	prompt() {
		view.prompt = "Place all Cherokee units not on the map at a British fortification in the southern dept.";
		let can_place = false;
		if (game.count > 0) {
			for (let i = 0; i < departments.southern.length; ++i) {
				let s = departments.southern[i];
				if (has_unbesieged_friendly_fortifications(s)) {
					can_place = true;
					gen_action_space(s);
				}
			}
		}
		if (!can_place)
			gen_action_next();
	},
	space(s) {
		place_and_restore_british_indian_tribe(s, 'Cherokee');
	},
	next() {
		end_action_phase();
	},
}

events.cherokee_uprising = {
	can_play() {
		if (game.events.cherokees)
			return true;
		return false;
	},
	play() {
		clear_undo();
		delete game.events.cherokees;
		game.events.cherokee_uprising = 1;
		set_active(enemy());
		game.state = 'cherokee_uprising';
		game.uprising = {
			regular: 2,
			southern: 1
		}
	},
}

states.cherokee_uprising = {
	prompt() {
		view.prompt = `Eliminate ${game.uprising.regular} regular, ${game.uprising.southern} southern provincial, and all Cherokee.`;
		let can_eliminate = false;
		for (let p = first_british_unit; p <= last_british_unit; ++p) {
			if (is_piece_on_map(p) && is_piece_unbesieged(p)) {
				let x = false;
				if (game.uprising.regular > 0 && is_regulars_unit(p))
					x = true;
				if (game.uprising.southern > 0 && is_provincial_unit_from(p, 'southern'))
					x = true;
				if (is_indian_tribe(p, 'Cherokee'))
					x = true;
				if (x) {
					can_eliminate = true;
					gen_action_piece(p);
				}
			}
		}
		if (!can_eliminate)
			gen_action_next();
	},
	piece(p) {
		push_undo();
		if (is_regulars_unit(p))
			game.uprising.regular --;
		if (is_provincial_unit_from(p, 'southern'))
			game.uprising.southern --;
		eliminate_piece(p);
	},
	next() {
		delete game.uprising;
		set_active(enemy());
		end_action_phase();
	},
}

events.treaty_of_easton = {
	can_play() {
		for (let s of in_or_adjacent_to_ohio_forks)
			if (has_unbesieged_friendly_fortifications(s) && has_british_drilled_troops(s))
				return true;
		return false;
	},
	play() {
		// TODO: treaty_of_easton state for manual elimination?
		for (let p = first_french_unit; p <= last_french_unit; ++p) {
			if (is_indian_unit(p) && is_piece_on_map(p) && is_piece_unbesieged(p)) {
				if (is_western_indian_unit(p)) {
					eliminate_piece(p);
				}
			}
		}
		end_action_phase();
	},
}

events.indians_desert = {
	play() {
		game.state = 'indians_desert';
		game.indians_desert = 0;
		game.count = 2;
	}
}

states.indians_desert = {
	prompt() {
		let can_desert = false;
		if (game.count > 0) {
			for (let p = first_enemy_unit; p <= last_enemy_unit; ++p) {
				if (is_indian_unit(p) && is_piece_on_map(p) && is_piece_unbesieged(p)) {
					if (!game.indians_desert || is_piece_in_space(p, game.indians_desert)) {
						can_desert = true;
						gen_action_piece(p);
					}
				}
			}
		}
		if (can_desert) {
			view.prompt = `Eliminate up to two unbesieged Indian units from any one space (${game.count} left).`;
		} else {
			view.prompt = "Eliminate up to two unbesieged Indian units from any one space \u2014 done.";
			gen_action_next();
		}
	},
	piece(p) {
		push_undo();
		if (!game.indians_desert)
			game.indians_desert = piece_space(p);
		eliminate_piece(p);
		game.count --;
	},
	next() {
		delete game.indians_desert;
		end_action_phase();
	},
}

events.louisbourg_squadrons = {
	can_play() {
		return is_friendly_controlled_space(LOUISBOURG);
	},
	play() {
		game.events.no_amphib = 1;
		log("French Navy operates aggressively.");
		log("No amphibious landings this year.");
		let roll = roll_die()
		if (roll <= 3) {
			log("No French naval moves ever.");
			log("British may play Quiberon.");
			log("Card removed.");
			game.events.no_fr_naval = 1;
			remove_card(LOUISBOURG_SQUADRONS);
		} else {
			log("No effect.");
		}
		end_action_phase();
	}
}

events.governor_vaudreuil_interferes = {
	can_play() {
		let n = 0;
		for (let p = first_enemy_leader; p <= last_enemy_leader; ++p) {
			if (is_piece_unbesieged(p))
				if (!game.events.no_fr_naval || piece_space(p) !== LOUISBOURG)
					++n;
		}
		return n >= 2;
	},
	play() {
		game.state = 'governor_vaudreuil_interferes';
		game.swap = 0;
	},
}

states.governor_vaudreuil_interferes = {
	prompt() {
		view.prompt = "Choose any 2 unbesieged French leaders and reverse their locations.";
		if (game.swap)
			view.who = game.swap;
		for (let p = first_enemy_leader; p <= last_enemy_leader; ++p) {
			if (is_piece_unbesieged(p))
				if (!game.events.no_fr_naval || piece_space(p) !== LOUISBOURG)
					if (p !== game.swap)
						gen_action_piece(p);
		}
	},
	piece(p) {
		if (game.swap) {
			let a = game.swap;
			delete game.swap;
			let a_loc = piece_space(a);
			let p_loc = piece_space(p);
			move_piece_to(a, p_loc);
			move_piece_to(p, a_loc);
			log(`${piece_name(p)} and ${piece_name(a)} reverse locations.`);
			end_action_phase();
		} else {
			push_undo();
			game.swap = p;
		}
	},
}

events.small_pox = {
	can_play() {
		for (let s = first_space; s <= last_space; ++s)
			if (count_enemy_units_in_space(s) > 4)
				return true;
		return false;
	},
	play() {
		game.state = 'small_pox';
	},
}

states.small_pox = {
	prompt() {
		view.prompt = "Choose a space with more than 4 units.";
		for (let s = first_space; s <= last_space; ++s)
			if (count_enemy_units_in_space(s) > 4)
				gen_action_space(s);
	},
	space(s) {
		clear_undo(); // rolling die
		log(`Small Pox in ${space_name(s)}.`);
		let roll = roll_die();
		if (count_enemy_units_in_space(s) > 8) {
			game.count = roll;
		} else {
			game.count = Math.ceil(roll / 2);
		}
		log(`Must eliminate ${game.count} steps.`);
		clear_undo();
		game.state = 'reduce_from_small_pox';
		game.small_pox = s;
		set_active(enemy());
	},
}

states.reduce_from_small_pox = {
	prompt() {
		view.prompt = `Small Pox in ${space_name(game.small_pox)} \u2014 eliminate ${game.count} steps.`;
		if (game.count > 0) {
			let can_reduce = false;
			for_each_friendly_unit_in_space(game.small_pox, p => {
				if (!is_unit_reduced(p)) {
					can_reduce = true;
					gen_action_piece(p);
				}
			});
			if (!can_reduce) {
				for_each_friendly_unit_in_space(game.small_pox, p => {
					if (is_unit_reduced(p))
						gen_action_piece(p);
				});
			}
		} else {
			gen_action_next();
		}
	},
	piece(p) {
		push_undo();
		game.count --;
		reduce_unit(p);
	},
	next() {
		log("Remove all Indians.");
		for_each_friendly_unit_in_space(game.small_pox, p => {
			if (is_indian_unit(p))
				eliminate_piece(p);
		});
		delete game.small_pox;
		set_active(enemy());
		end_action_phase();
	},
}

events.courier_intercepted = {
	can_play() {
		return enemy_player.hand.length > 0;
	},
	play() {
		let roll = roll_die();
		if (roll >= 3) {
			let i = random(enemy_player.hand.length);
			let c = enemy_player.hand[i];
			enemy_player.hand.splice(i, 1);
			player.hand.push(c);
			log(`Steals ${card_name(c)}.`);
		} else {
			log("No effect.");
		}
		end_action_phase();
	},
}

events.françois_bigot = {
	can_play() {
		return enemy_player.hand.length > 0;
	},
	play() {
		let i = random(enemy_player.hand.length);
		let c = enemy_player.hand[i];
		enemy_player.hand.splice(i, 1);
		game.cards.discarded.push(c);
		log(`France discards ${card_name(c)}.`);
		if (c === SURRENDER)
			game.events.surrender = 1;
		end_action_phase();
	},
}

const british_ministerial_crisis_cards = [ 47, 48, 54, 57, 58, 59, 60, 61, 63, 64 ];

events.british_ministerial_crisis = {
	can_play() {
		return enemy_player.hand.length > 0;
	},
	play() {
		let n = 0;
		for (let i = 0; i < enemy_player.hand.length; ++i) {
			let c = enemy_player.hand[i];
			if (british_ministerial_crisis_cards.includes(c))
				++n;
		}
		if (n > 0) {
			set_active(enemy());
			game.state = 'british_ministerial_crisis';
			game.count = 1;
		} else {
			log("British player has none of the listed cards in hand.");
			end_action_phase();
		}
	},
}

states.british_ministerial_crisis = {
	prompt() {
		view.prompt = "British Ministerial Crisis \u2014 discard one of the listed cards.";
		if (game.count > 0) {
			for (let i = 0; i < player.hand.length; ++i) {
				let c = player.hand[i];
				if (british_ministerial_crisis_cards.includes(c))
					gen_action_discard(c);
			}
		} else {
			gen_action_next();
		}
	},
	card(c) {
		push_undo();
		game.count = 0;
		discard_card(c, "");
	},
	next() {
		set_active(enemy());
		end_action_phase();
	}
}

function count_reduced_unbesieged_provincial_units_from(dept) {
	let n = 0;
	for (let p = first_british_unit; p <= last_british_unit; ++p)
		if (is_provincial_unit_from(p, dept) && is_piece_on_map(p))
			if (is_piece_unbesieged(p) && is_unit_reduced(p))
				++n;
	return n;
}

function count_unbesieged_provincial_units_from(dept) {
	let n = 0;
	// OPTIMIZE: use provincial unit numbers
	for (let p = first_british_unit; p <= last_british_unit; ++p)
		if (is_provincial_unit_from(p, dept) && is_piece_on_map(p))
			if (is_piece_unbesieged(p))
				++n;
	return n;
}

function count_provincial_units_from(dept) {
	let n = 0;
	// OPTIMIZE: use provincial unit numbers
	for (let p = first_british_unit; p <= last_british_unit; ++p)
		if (is_provincial_unit_from(p, dept) && is_piece_on_map(p))
			++n;
	return n;
}

events.stingy_provincial_assembly = {
	can_play() {
		if (game.tracks.pa === ENTHUSIASTIC)
			return false;
		let num_n = count_unbesieged_provincial_units_from('northern');
		let num_s = count_unbesieged_provincial_units_from('southern');
		return (num_n + num_s) > 0;
	},
	play() {
		let num_n = count_unbesieged_provincial_units_from('northern');
		let num_s = count_unbesieged_provincial_units_from('southern');
		if (num_n > 0 && num_s === 0) {
			goto_stingy_provincial_assembly('northern');
		} else if (num_n === 0 && num_s > 0) {
			goto_stingy_provincial_assembly('southern');
		} else {
			game.state = 'stingy_provincial_assembly_department';
			game.count = 1;
		}
	}
}

states.stingy_provincial_assembly_department = {
	prompt() {
		view.prompt = "Stingy Provincial Assembly \u2014 choose a department.";
		gen_action('northern');
		gen_action('southern');
	},
	northern() {
		goto_stingy_provincial_assembly('northern');
	},
	southern() {
		goto_stingy_provincial_assembly('southern');
	},
}

function goto_stingy_provincial_assembly(dept) {
	clear_undo();
	set_active(enemy());
	game.state = 'stingy_provincial_assembly';
	game.department = dept;
	game.count = 1;
}

states.stingy_provincial_assembly = {
	prompt() {
		view.prompt = `Stingy Provincial Assembly \u2014 remove a ${game.department} provincial unit.`;
		if (game.count > 0) {
			// OPTIMIZE: use provincial unit numbers
			for (let p = first_british_unit; p <= last_british_unit; ++p)
				if (is_provincial_unit_from(p, game.department) && is_piece_unbesieged(p))
					gen_action_piece(p);
		} else {
			gen_action_next();
		}
	},
	piece(p) {
		push_undo();
		game.count = 0;
		eliminate_piece(p);
	},
	next() {
		set_active(enemy());
		end_action_phase();
	},
}

events.british_colonial_politics = {
	can_play() {
		if (game.active === FRANCE)
			return game.tracks.pa > 0;
		return game.tracks.pa < 2;
	},
	play() {
		if (game.active === FRANCE) {
			game.tracks.pa -= 1;
			log(`Provincial Assemblies reduced to ${pa_name()}.`);
			goto_enforce_provincial_limits();
		} else {
			game.tracks.pa += 1;
			log(`Provincial Assemblies increased to ${pa_name()}.`);
			end_action_phase();
		}
	},
}

function pa_name() {
	switch (game.tracks.pa) {
	case RELUCTANT: return "Reluctant";
	case SUPPORTIVE: return "Supportive";
	case ENTHUSIASTIC: return "Enthusiastic";
	}
}

const provincial_limit_southern = [ 2, 4, 6 ];
const provincial_limit_northern = [ 6, 10, 18 ];

function provincial_limit(dept) {
	if (dept === 'northern')
		return provincial_limit_northern[game.tracks.pa];
	else
		return provincial_limit_southern[game.tracks.pa];
}

function goto_enforce_provincial_limits() {
	if (game.tracks.pa < ENTHUSIASTIC) {
		let num_s = count_provincial_units_from('southern');
		let num_n = count_provincial_units_from('northern');
		let max_n = provincial_limit('northern');
		let max_s = provincial_limit('southern');
		if (num_s > max_s || num_n > max_n) {
			clear_undo();
			set_active(enemy());
			game.state = 'enforce_provincial_limits';
			return;
		}
	}
	end_action_phase();
}

states.enforce_provincial_limits = {
	prompt() {
		let num_s = count_provincial_units_from('southern');
		let num_n = count_provincial_units_from('northern');
		let max_n = provincial_limit('northern');
		let max_s = provincial_limit('southern');
		console.log("British Colonial Politics", num_s, max_s, num_n, max_n);
		let can_remove = false;
		if (num_s > max_s || num_n > max_n) {
			// OPTIMIZE: use provincial unit numbers
			for (let p = first_british_unit; p <= last_british_unit; ++p) {
				if (num_s > max_s && is_provincial_unit_from(p, 'southern') && is_piece_unbesieged(p)) {
					gen_action_piece(p);
					can_remove = true;
				} else if (num_n > max_n && is_provincial_unit_from(p, 'northern') && is_piece_unbesieged(p)) {
					gen_action_piece(p);
					can_remove = true;
				}
			}
		}
		if (!can_remove) {
			view.prompt = `Remove provincial units over limit \u2014 done.`;
			gen_action_next();
		} else {
			view.prompt = `Remove provincial units over limit: ${num_s}/${max_s} southern, ${num_n}/${max_n} northern.`;
		}
	},
	piece(p) {
		push_undo();
		eliminate_piece(p);
	},
	next() {
		set_active(enemy());
		end_action_phase();
	},
}

function can_raise_provincial_regiments(dept) {
	let num = count_provincial_units_from(dept);
	let max = provincial_limit(dept);
	return num < max;
}

function can_restore_provincial_regiments(dept) {
	return count_reduced_unbesieged_provincial_units_from(dept) > 0;
}

events.raise_provincial_regiments = {
	can_play() {
		if (game.tracks.pa === RELUCTANT)
			return false;
		if (can_raise_provincial_regiments('northern') || can_restore_provincial_regiments('northern'))
			return true;
		if (can_raise_provincial_regiments('southern') || can_restore_provincial_regiments('southern'))
			return true;
		return false;
	},
	play() {
		game.state = 'raise_provincial_regiments_where';
	},
}

states.raise_provincial_regiments_where = {
	prompt() {
		view.prompt = "Raise Provincial regiments in which department?";
		if (can_raise_provincial_regiments('northern') || can_restore_provincial_regiments('northern'))
			gen_action('northern');
		if (can_raise_provincial_regiments('southern') || can_restore_provincial_regiments('southern'))
			gen_action('southern');
	},
	northern() {
		push_undo();
		let num = count_provincial_units_from('northern');
		let max = provincial_limit('northern');
		game.state = 'raise_provincial_regiments';
		game.count = clamp(max - num, 0, 4);
		game.department = 'northern';
	},
	southern() {
		push_undo();
		let num = count_provincial_units_from('southern');
		let max = provincial_limit('southern');
		game.state = 'raise_provincial_regiments';
		game.count = clamp(max - num, 0, 2);
		game.department = 'southern';
		game.did_raise = 0;
	},
}

function find_unused_provincial(dept) {
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
		if (is_provincial_unit_from(p, dept) && is_piece_unused(p))
			return p;
	return 0;
}

states.raise_provincial_regiments = {
	prompt() {
		let num = count_provincial_units_from(game.department);
		let can_raise = false;
		if (!game.did_raise) {
			if (can_restore_provincial_regiments(game.department)) {
				can_raise = true;
				gen_action('restore');
			}
		}
		if (game.count > 0) {
			let list = departments[game.department];
			for (let i = 0; i < list.length; ++i) {
				let s = list[i];
				if (has_unbesieged_friendly_fortifications(s)) {
					can_raise = true;
					gen_action_space(s);
				}
			}
		}
		if (can_raise) {
			if (game.did_raise)
				view.prompt = `Raise Provincial regiments in ${game.department} department.`;
			else
				view.prompt = `Raise Provincial regiments in ${game.department} department or restore all to full.`;
		} else {
			view.prompt = `Raise Provincial regiments in ${game.department} department \u2014 done.`;
			gen_action_next();
		}
	},
	restore() {
		// TODO: restore_provincial_regiments state for manual restoring?
		push_undo();
		for (let p = first_friendly_unit; p <= last_friendly_unit; ++p) {
			if (is_provincial_unit_from(p, game.department))
				if (can_restore_unit(p))
					restore_unit(p);
		}
		game.count = 0;
	},
	space(s) {
		push_undo();
		let p = find_unused_provincial(game.department);
		place_piece(p, s);
		game.count --;
		game.did_raise = 1;
	},
	next() {
		delete game.did_raise;
		delete game.department;
		end_action_phase();
	}
}

function is_card_removed(card) {
	return game.cards.removed.includes(card);
}

events.quiberon_bay = {
	can_play() {
		if (is_card_removed(LOUISBOURG_SQUADRONS))
			return true;
		if (is_friendly_controlled_space(LOUISBOURG))
			return true;
		if (game.tracks.year > 1759)
			return true;
		return false;
	},
	play() {
		log("Battle destroys French fleet.");
		game.events.quiberon = 1;
		delete game.events.diplo;
	},
}

function is_friendly_siege(space) {
	if (has_friendly_fort(space))
		return true;
	if (is_fortress(space))
		return has_unbesieged_enemy_units(space);
	return false;
}

events.bastions_repaired = {
	can_play() {
		let result = false;
		for_each_siege((space, level) => {
			console.log("for_each_siege", space, level);
			if (level > 0 && is_friendly_siege(space))
				result = true;
		});
		return result;
	},
	play() {
		game.state = 'bastions_repaired';
		game.count = 1;
	},
}

states.bastions_repaired = {
	prompt() {
		if (game.count > 0) {
			view.prompt = "Replace a siege 1 or siege 2 marker on the map with siege 0.";
			for_each_siege((space, level) => {
				if (level > 0 && is_friendly_siege(space))
					gen_action_space(space);
			});
		} else {
			view.prompt = "Replace a siege 1 or siege 2 marker on the map with siege 0 - done.";
			gen_action_next();
		}
	},
	space(s) {
		push_undo();
		log(`Replaces siege marker in ${space_name(s)}.`);
		game.sieges[s] = 0;
		game.count = 0;
	},
	next() {
		end_action_phase();
	},
}

function is_colonial_recruit(p) {
	return is_coureurs_unit(p) || is_rangers_unit(p) || is_light_infantry_unit(p) || is_provincial_unit(p);
}

events.colonial_recruits = {
	can_play() {
		let n = 0;
		for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
			if (is_colonial_recruit(p) && is_piece_unbesieged(p) && is_unit_reduced(p))
				++n;
		return n > 0;
	},
	play() {
		clear_undo(); // rolling die
		let roll = roll_die();
		game.state = 'colonial_recruits';
		game.count = roll;
	},
}

states.colonial_recruits = {
	prompt() {
		let can_restore = false;
		if (game.count > 0) {
			for (let p = first_friendly_unit; p <= last_friendly_unit; ++p) {
				if (is_colonial_recruit(p)) {
					if (can_restore_unit(p)) {
						can_restore = true;
						gen_action_piece(p);
					}
				}
			}
		}
		if (can_restore) {
			view.prompt = `Restore ${game.count} reduced colonial recruits.`;
		} else {
			view.prompt = `Restore colonial recruits \u2014 done.`;
			gen_action_next();
		}
	},
	piece(p) {
		push_undo();
		restore_unit(p);
		game.count --;
	},
	next() {
		end_action_phase();
	},
}

function has_unbesieged_reduced_regular_or_light_infantry_units() {
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
		if (is_regulars_unit(p) || is_light_infantry_unit(p))
			if (is_piece_unbesieged(p) && is_unit_reduced(p))
				return true;
	return false;
}

events.troop_transports_and_local_enlistments = {
	can_play() {
		if (game.active === FRANCE) {
			if (game.events.quiberon)
				return false;
			if (is_british_controlled_space(QUEBEC))
				return false;
		}
		return has_unbesieged_reduced_regular_or_light_infantry_units();
	},
	play() {
		game.state = 'restore_regular_or_light_infantry_units';
		if (game.active === FRANCE)
			game.count = 3;
		else
			game.count = 6;
	},
}

events.victories_in_germany_release_troops_and_finances_for_new_world = {
	can_play() {
		if (game.tracks.year <= 1755)
			return false;
		if (game.active === FRANCE) {
			if (game.events.quiberon)
				return false;
			if (is_british_controlled_space(QUEBEC))
				return false;
		}
		return has_unbesieged_reduced_regular_or_light_infantry_units();
	},
	play() {
		game.state = 'restore_regular_or_light_infantry_units';
		game.count = roll_die();
	},
}

states.restore_regular_or_light_infantry_units = {
	prompt() {
		let can_restore = false;
		if (game.count > 0) {
			for (let p = first_friendly_unit; p <= last_friendly_unit; ++p) {
				if (is_regulars_unit(p) || is_light_infantry_unit(p)) {
					if (can_restore_unit(p)) {
						can_restore = true;
						gen_action_piece(p);
					}
				}
			}
		}
		if (can_restore) {
			view.prompt = `Restore ${game.count} reduced regular or light infantry.`;
		} else {
			view.prompt = `Restore reduced regular or light infantry \u2014 done.`;
			gen_action_next();
		}
	},
	piece(p) {
		push_undo();
		restore_unit(p);
		game.count --;
	},
	next() {
		end_action_phase();
	},
}

function find_unused_friendly_militia() {
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
		if (is_militia_unit(p) && is_piece_unused(p))
			return p;
	return 0;
}

events.call_out_militias = {
	play() {
		game.state = 'call_out_militias';
		game.count = 2;
	}
}

states.call_out_militias = {
	prompt() {
		view.prompt = `Place a Militia unit into a militia box, or restore 2 to full strength.`;
		let can_place = false;
		if (game.count === 2) {
			if (game.active === BRITAIN) {
				if (find_unused_friendly_militia()) {
					can_place = true;
					gen_action_space(SOUTHERN_COLONIAL_MILITIAS);
					gen_action_space(NORTHERN_COLONIAL_MILITIAS);
				}
			} else {
				if (find_unused_friendly_militia()) {
					can_place = true;
					gen_action_space(ST_LAWRENCE_CANADIAN_MILITIAS);
				}
			}
		}
		if (game.count > 0) {
			for (let p = first_friendly_unit; p <= last_friendly_unit; ++p) {
				if (is_militia_unit(p) && is_unit_reduced(p) && is_militia_box(piece_space(p))) {
					can_place = true;
					gen_action_piece(p);
				}
			}
		}
		if (game.count === 0 || !can_place)
			gen_action_next();
	},
	space(s) {
		push_undo();
		let p = find_unused_friendly_militia();
		place_piece(p, s);
		game.count -= 2;
	},
	piece(p) {
		push_undo();
		restore_unit(p);
		game.count -= 1;
	},
	next() {
		end_action_phase();
	},
}

function find_unused_ranger_unit() {
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
		if (is_rangers_unit(p) && is_piece_unused(p))
			return p;
	return 0;
}

events.rangers = {
	play() {
		game.state = 'rangers';
		game.count = 2;
	}
}

states.rangers = {
	prompt() {
		view.prompt = `Place a Rangers unit at a fortification, or restore 2 to full strength.`;
		let can_place = false;
		if (game.count === 2) {
			if (find_unused_ranger_unit()) {
				for (let s = first_space; s <= last_space; ++s) {
					if (has_unbesieged_friendly_fortifications(s)) {
						can_place = true;
						gen_action_space(s);
					}
						
				}
			}
		}
		if (game.count > 0) {
			for (let p = first_friendly_unit; p <= last_friendly_unit; ++p) {
				if (is_rangers_unit(p)) {
					if (can_restore_unit(p)) {
						can_place = true;
						gen_action_piece(p);
					}
				}
			}
		}
		if (game.count === 0 || !can_place)
			gen_action_next();
	},
	space(s) {
		push_undo();
		let p = find_unused_ranger_unit();
		place_piece(p, s);
		game.count -= 2;
	},
	piece(p) {
		push_undo();
		restore_unit(p);
		game.count -= 1;
	},
	next() {
		end_action_phase();
	},
}

function find_unused_french_regular_unit() {
	for (let p = first_french_unit; p <= last_french_unit; ++p)
		if (is_regulars_unit(p) && is_piece_unused(p))
			return p;
	return 0;
}

events.french_regulars = {
	can_play() {
		if (game.events.french_regulars)
			return false;
		if (game.events.quiberon)
			return false;
		if (!has_british_units(QUEBEC))
			return true;
		if (!has_british_units(LOUISBOURG))
			return true;
		return false;
	},
	play() {
		game.state = 'french_regulars';
		game.leader = [];
		if (game.events.once_french_regulars) {
			game.leader.push(MONTCALM);
			game.leader.push(LEVIS);
			game.leader.push(BOUGAINVILLE);
			move_piece_to(MONTCALM, leader_box(MONTCALM));
			move_piece_to(LEVIS, leader_box(LEVIS));
			move_piece_to(BOUGAINVILLE, leader_box(BOUGAINVILLE));
			delete game.events.once_french_regulars;
		}
		game.count = 2;
	}
}

states.french_regulars = {
	prompt() {
		if (game.leader.length > 0) {
			let p = game.leader[0];
			view.prompt = `Place ${piece_name(p)} at either Québec or Louisbourg.`;
			view.who = p;
		} else {
			view.prompt = `Place ${game.count} Regulars at either Québec or Louisbourg.`;
		}
		if (game.count > 0) {
			if (!has_british_units(QUEBEC))
				gen_action_space(QUEBEC);
			if (!has_british_units(LOUISBOURG))
				gen_action_space(LOUISBOURG);
		} else {
			gen_action_next();
		}
	},
	space(s) {
		push_undo();
		if (game.leader.length > 0) {
			let p = game.leader.shift();
			place_piece(p, s);
		} else {
			let p = find_unused_french_regular_unit();
			if (p) {
				place_piece(p, s);
				game.count --;
			} else {
				game.count = 0;
			}
		}
	},
	next() {
		game.events.french_regulars = 1;
		delete game.leader;
		end_action_phase();
	},
}

function find_unused_light_infantry_unit() {
	for (let p = first_british_unit; p <= last_british_unit; ++p)
		if (is_light_infantry_unit(p) && is_piece_unused(p))
			return p;
	return 0;
}

events.light_infantry = {
	play() {
		clear_undo(); // drawing leader from pool
		game.state = 'light_infantry';
		game.count = 2;
		game.leader = draw_leader_from_pool();
	}
}

states.light_infantry = {
	prompt() {
		if (game.leader) {
			view.prompt = `Place ${piece_name(game.leader)} at any fortress.`;
			view.who = game.leader;
		} else {
			view.prompt = `Place ${game.count} Light Infantry at any fortresses.`;
		}
		if (game.count > 0) {
			for (let s = first_space; s <= last_space; ++s) {
				if (has_unbesieged_friendly_fortress(s)) {
					gen_action_space(s);
				}
			}
		}
		if (game.count === 0)
			gen_action_next();
	},
	space(s) {
		push_undo();
		if (game.leader) {
			place_piece(game.leader, s);
			game.leader = 0;
		} else {
			let p = find_unused_light_infantry_unit();
			if (p) {
				place_piece(p, s);
				game.count --;
			} else {
				log("No more Light Infantry units available.");
				game.count = 0;
			}
		}
	},
	next() {
		end_british_reinforcement();
	},
}

function find_unused_3_4_regular_unit() {
	for (let p = first_british_unit; p <= last_british_unit; ++p)
		if (is_3_4_regular_unit(p) && is_piece_unused(p))
			return p;
	return 0;
}

events.british_regulars = {
	can_play() {
		// TODO: check available ports
		if (game.events.british_regulars)
			return false;
		return true;
	},
	play() {
		clear_undo(); // drawing leader from pool
		game.state = 'british_regulars';
		game.count = 3;
		game.leader = draw_leader_from_pool();
	}
}

states.british_regulars = {
	prompt() {
		if (game.leader) {
			view.prompt = `Place ${piece_name(game.leader)} at any port.`;
			view.who = game.leader;
		} else {
			view.prompt = `Place ${game.count} Regulars at any ports.`;
		}
		if (game.count > 0) {
			for_each_british_controlled_port(s => {
				if (can_place_in_space(s))
					gen_action_space(s);
			});
		} else {
			gen_action_next();
		}
	},
	space(s) {
		push_undo();
		if (game.leader) {
			place_piece(game.leader, s);
			game.leader = 0;
		} else {
			let p = find_unused_3_4_regular_unit();
			if (p) {
				place_piece(p, s);
				game.count --;
			} else {
				game.count = 0;
			}
		}
	},
	next() {
		game.events.british_regulars = 1;
		end_british_reinforcement();
	},
}

function find_unused_highland_unit() {
	for (let p = first_british_unit; p <= last_british_unit; ++p)
		if (is_highland_unit(p) && is_piece_unused(p))
			return p;
	return 0;
}

events.highlanders = {
	can_play() {
		// TODO: check available ports
		if (game.events.pitt || game.tracks.year > 1758)
			return true;
		return false;
	},
	play(card) {
		clear_undo(); // drawing leader from pool
		game.state = 'highlanders';
		game.leader = [];
		if (card === 60) {
			game.count = 4;
			for (let i = 0; i < 2; ++i) {
				let p = draw_leader_from_pool();
				if (p)
					game.leader.push(p);
			}
		} else {
			game.count = 1;
			let p = draw_leader_from_pool();
			if (p)
				game.leader.push(p);
		}
	}
}

states.highlanders = {
	prompt() {
		if (game.leader.length > 0) {
			let p = game.leader[0];
			view.prompt = `Place ${piece_name(p)} at any port.`;
			view.who = p;
		} else {
			view.prompt = `Place ${game.count} Highlanders at any ports.`;
		}
		if (game.count > 0) {
			for_each_british_controlled_port(s => {
				if (can_place_in_space(s))
					gen_action_space(s);
			});
		} else {
			gen_action_next();
		}
	},
	space(s) {
		push_undo();
		if (game.leader.length > 0) {
			let p = game.leader.shift();
			place_piece(p, s);
		} else {
			let p = find_unused_highland_unit();
			if (p) {
				place_piece(p, s);
				game.count --;
			} else {
				game.count = 0;
			}
		}
	},
	next() {
		end_british_reinforcement();
	},
}

function find_unused_royal_american_unit() {
	for (let p = first_british_unit; p <= last_british_unit; ++p)
		if (is_royal_american_unit(p) && is_piece_unused(p))
			return p;
	return 0;
}

events.royal_americans = {
	can_play() {
		// TODO: check available fortresses in northern or southern depts
		return true;
	},
	play() {
		clear_undo(); // drawing leader from pool
		game.state = 'royal_americans';
		game.count = 4;
		game.leader = draw_leader_from_pool();
	}
}

states.royal_americans = {
	prompt() {
		if (game.leader) {
			let p = game.leader;
			view.prompt = `Place ${piece_name(p)} at any fortress in the departments.`;
			view.who = p;
		} else {
			view.prompt = `Place ${game.count} Royal American units at any fortress in the departments.`;
		}
		if (game.count > 0) {
			// OPTIMIZE: use a list of fortresses in the departments
			departments.northern.forEach(s => {
				if (has_unbesieged_friendly_fortress(s))
					gen_action_space(s);
			});
			departments.southern.forEach(s => {
				if (has_unbesieged_friendly_fortress(s))
					gen_action_space(s);
			});
		} else {
			gen_action_next();
		}
	},
	space(s) {
		push_undo();
		if (game.leader) {
			place_piece(game.leader, s);
			game.leader = 0;
		} else {
			let p = find_unused_royal_american_unit();
			if (p) {
				place_piece(p, s);
				game.count --;
			} else {
				game.count = 0;
			}
		}
	},
	next() {
		end_british_reinforcement();
	},
}

function find_unused_coureurs_unit() {
	for (let p = first_french_unit; p <= last_french_unit; ++p)
		if (is_coureurs_unit(p) && is_piece_unused(p))
			return p;
	return 0;
}

events.acadians_expelled = {
	play() {
		// TODO: acadians_expelled_halifax state for manual placing?
		for (let i = 0; i < 2; ++i) {
			let p = find_unused_3_4_regular_unit();
			place_piece(p, HALIFAX);
		}

		// TODO: restore_acadians_expelled state for manual restoring?
		for (let p = first_french_unit; p <= last_french_unit; ++p) {
			if (is_militia_unit(p) || is_coureurs_unit(p))
				if (can_restore_unit(p))
					restore_unit(p);
		}

		set_active(enemy());
		game.state = 'acadians_expelled';
		game.count = 1;
	},
}

states.acadians_expelled = {
	prompt() {
		view.prompt = "Place a Coureurs unit at Québec or Louisbourg.";
		if (game.count > 0) {
			if (!has_british_units(QUEBEC))
				gen_action_space(QUEBEC);
			if (!has_british_units(LOUISBOURG))
				gen_action_space(LOUISBOURG);
		} else {
			gen_action_next();
		}
	},
	space(s) {
		push_undo();
		let p = find_unused_coureurs_unit();
		if (p)
			place_piece(p, s);
		game.count = 0;
	},
	next() {
		set_active(enemy());
		end_action_phase();
	},
}

const william_pitt_cards = [
	'highlanders',
	'british_regulars',
	'light_infantry',
	'troop_transports_and_local_enlistments'
];

events.william_pitt = {
	play() {
		game.events.pitt = 1;
		game.state = 'william_pitt';
		game.count = 1;
	}
}

states.william_pitt = {
	prompt() {
		if (game.count > 0) {
			view.prompt = "Draw Highlanders, British Regulars, Light Infantry or Troop Transports from Discard.";
			view.hand = game.cards.discarded;
			for (let c of game.cards.discarded) {
				if (william_pitt_cards.includes(cards[c].event))
					gen_action('card', c);
			}
		} else {
			view.prompt = "Draw Highlanders, British Regulars, Light Infantry or Troop Transports from Discard - done.";
		}
		gen_action_next();
	},
	card(c) {
		push_undo();
		log(`Draws ${card_name(c)} from discard.`);
		remove_from_array(game.cards.discarded, c);
		player.hand.push(c);
		game.count = 0;
	},
	next() {
		end_action_phase();
	}
}

const diplomatic_revolution_cards = [
	'french_regulars',
	'troop_transports_and_local_enlistments'
];

events.diplomatic_revolution = {
	can_play() {
		return !game.events.quiberon;
	},
	play() {
		game.events.diplo = 1;
		game.state = 'diplomatic_revolution';
		game.count = 1;
	}
}

states.diplomatic_revolution = {
	prompt() {
		if (game.count > 0) {
			view.prompt = "Draw French Regulars or Troop Transports from Discard.";
			view.hand = view.cards.discard;
			for (let c of view.cards.discarded) {
				if (diplomatic_revolution_cards.includes(cards[c].event))
					gen_action('card', c);
			}
		} else {
			view.prompt = "Draw French Regulars or Troop Transports from Discard - done.";
		}
		gen_action_next();
	},
	card(c) {
		push_undo();
		log(`Draws ${card_name(c)} from discard.`);
		remove_from_array(game.cards.discarded, c);
		player.hand.push(c);
		game.count = 0;
	},
	next() {
		end_action_phase();
	}
}

events.intrigues_against_shirley = {
	can_play() {
		return game.tracks.vp >= 1 && is_piece_on_map(SHIRLEY) && is_piece_unbesieged(SHIRLEY);
	},
	play() {
		game.state = 'intrigues_against_shirley';
	}
}

states.intrigues_against_shirley = {
	prompt() {
		view.prompt = "Eliminate Shirley.";
		gen_action_piece(SHIRLEY);
	},
	piece(p) {
		eliminate_piece(SHIRLEY);
		end_action_phase();
	},
}

// SETUP

exports.scenarios = [
	"Annus Mirabilis",
	"Early War Campaign",
	"Late War Campaign",
	"The Full Campaign",
];

exports.roles = [
	FRANCE,
	BRITAIN,
];

exports.ready = function (scenario, options, players) {
	return players.length === 2;
}

function setup_markers(m, list) {
	list.forEach(name => m.push(find_space(name)));
}

function setup_leader(where, who) {
	game.pieces.location[find_leader(who)] = find_space(where);
}

function setup_unit(where, who) {
	game.pieces.location[find_unused_unit(who)] = find_space(where);
}

function setup_1757(end_year) {
	game.tracks.year = 1757;
	game.tracks.end_year = end_year;
	game.tracks.season = EARLY;
	game.tracks.vp = 4;
	game.tracks.pa = SUPPORTIVE;

	// TODO: optional rule start at 2VP for balance
	// see https://boardgamegeek.com/thread/1366550/article/19163465#19163465

	for (let i = 1; i <= 62; ++i)
		game.cards.draw_pile.push(i);
	for (let i = 63; i <= 70; ++i)
		game.cards.removed.push(i);

	setup_markers(game.France.allied, [
		"Mingo Town",
		"Logstown",
		"Pays d'en Haut",
		"Mississauga",
	]);

	setup_markers(game.France.forts, [
		"Ticonderoga",
		"Crown Point",
		"Niagara",
		"Ohio Forks",
	]);

	setup_markers(game.France.stockades, [
		"Île-aux-Noix",
		"St-Jean",
		"Oswegatchie",
		"Cataraqui",
		"Toronto",
		"Presqu'île",
		"French Creek",
		"Venango",
	]);

	setup_leader("Louisbourg", "Drucour");
	setup_unit("Louisbourg", "Marine");
	setup_unit("Louisbourg", "Artois");
	setup_unit("Louisbourg", "Bourgogne");
	setup_unit("Louisbourg", "Boishébert Acadian");

	setup_leader("Québec", "Lévis");
	setup_unit("Québec", "Marine");
	setup_unit("Québec", "Guyenne");
	setup_unit("Québec", "La Reine");

	setup_leader("Montréal", "Montcalm");
	setup_leader("Montréal", "Vaudreuil");
	setup_unit("Montréal", "Béarn");
	setup_unit("Montréal", "La Sarre");
	setup_unit("Montréal", "Repentigny");
	setup_unit("Montréal", "Huron");
	setup_unit("Montréal", "Potawatomi");
	setup_unit("Montréal", "Ojibwa");
	setup_unit("Montréal", "Mississauga");

	setup_unit("Crown Point", "Marine Detachment");
	setup_unit("Crown Point", "Perière");

	setup_leader("Ticonderoga", "Rigaud");
	setup_leader("Ticonderoga", "Bougainville");
	setup_unit("Ticonderoga", "Languedoc");
	setup_unit("Ticonderoga", "Royal Roussillon");
	setup_unit("Ticonderoga", "Marin");

	setup_leader("Cataraqui", "Villiers");
	setup_unit("Cataraqui", "Marine Detachment");
	setup_unit("Cataraqui", "Léry");

	setup_unit("Niagara", "Marine Detachment");
	setup_unit("Niagara", "Joncaire");

	setup_unit("Presqu'île", "Marine Detachment");
	setup_unit("French Creek", "Marine Detachment");
	setup_unit("Venango", "Langlade");

	setup_leader("Ohio Forks", "Dumas");
	setup_unit("Ohio Forks", "Marine Detachment");
	setup_unit("Ohio Forks", "Marine Detachment");
	setup_unit("Ohio Forks", "Ligneris");

	setup_unit("Logstown", "Shawnee");
	setup_unit("Mingo Town", "Mingo");

	setup_leader("eliminated", "Dieskau");
	setup_leader("eliminated", "Beaujeu");

	setup_markers(game.Britain.forts, [
		"Hudson Carry South",
		"Hudson Carry North",
		"Will's Creek",
		"Shamokin",
	]);

	setup_markers(game.Britain.forts_uc, [
		"Winchester",
		"Shepherd's Ferry",
	]);

	setup_markers(game.Britain.stockades, [
		"Schenectady",
		"Hoosic",
		"Charlestown",
		"Augusta",
		"Woodstock",
		"Carlisle",
		"Harris's Ferry",
		"Lancaster",
		"Reading",
		"Easton",
	]);

	setup_unit("Winchester", "Virginia");
	setup_unit("Shepherd's Ferry", "Maryland");
	setup_unit("Carlisle", "Pennsylvania");
	setup_unit("Shamokin", "Pennsylvania");
	setup_unit("Philadelphia", "1/60th");

	setup_leader("New York", "Loudoun");
	setup_leader("New York", "Abercromby");
	setup_unit("New York", "22nd");
	setup_unit("New York", "27th");
	setup_unit("New York", "35th");
	setup_unit("New York", "2/60th");
	setup_unit("New York", "3/60th");
	setup_unit("New York", "4/60th");

	setup_leader("Albany", "Dunbar");
	setup_unit("Albany", "44th");
	setup_unit("Albany", "48th");

	setup_leader("Hudson Carry South", "Webb");
	setup_unit("Hudson Carry South", "Rogers");
	setup_unit("Hudson Carry South", "Massachusetts");
	setup_unit("Hudson Carry South", "Connecticut");
	setup_unit("Hudson Carry South", "Rhode Island");

	setup_unit("Hudson Carry North", "New Hampshire");
	setup_unit("Hudson Carry North", "New Jersey");

	setup_leader("Schenectady", "Johnson");
	setup_unit("Schenectady", "New York");
	setup_unit("Schenectady", "1/42nd");

	setup_leader("Halifax", "Monckton");
	setup_unit("Halifax", "40th");
	setup_unit("Halifax", "45th");
	setup_unit("Halifax", "47th");

	setup_unit("Southern Colonial Militias", "Colonial Militia");

	game.pieces.pool.push(find_leader("Amherst"));
	game.pieces.pool.push(find_leader("Bradstreet"));
	game.pieces.pool.push(find_leader("Forbes"));
	game.pieces.pool.push(find_leader("Murray"));
	game.pieces.pool.push(find_leader("Wolfe"));

	setup_leader("eliminated", "Braddock");
	setup_leader("eliminated", "Shirley");

	game.events.pitt = 1;
	game.events.diplo = 1;

	start_year();

	return game;
}

function setup_1755() {
	game.tracks.year = 1755;
	game.tracks.season = EARLY;
	game.tracks.vp = 0;
	game.tracks.pa = SUPPORTIVE;

	for (let i = 1; i <= 70; ++i)
		game.cards.draw_pile.push(i);

	setup_markers(game.France.allied, [
		"Pays d'en Haut",
		"Kahnawake",
		"St-François",
	]);
	setup_markers(game.Britain.allied, [
		"Canajoharie",
	]);

	setup_markers(game.France.forts, [
		"Crown Point",
		"Niagara",
		"Ohio Forks",
	]);
	setup_markers(game.France.stockades, [
		"Île-aux-Noix",
		"St-Jean",
		"Oswegatchie",
		"Cataraqui",
		"Toronto",
		"Presqu'île",
		"French Creek",
		"Venango",
	]);

	setup_leader("Louisbourg", "Drucour");
	setup_unit("Louisbourg", "Marine");
	setup_unit("Louisbourg", "Artois");
	setup_unit("Louisbourg", "Bourgogne");

	setup_leader("Québec", "Dieskau");
	setup_leader("Québec", "Vaudreuil");
	setup_unit("Québec", "Béarn");
	setup_unit("Québec", "Guyenne");
	setup_unit("Québec", "La Reine");
	setup_unit("Québec", "Languedoc");

	setup_leader("Montréal", "Rigaud");
	setup_unit("Montréal", "Marine");
	setup_unit("Montréal", "Repentigny");
	setup_unit("Montréal", "Perière");
	setup_unit("Montréal", "Caughnawaga");
	setup_unit("Montréal", "Abenaki");

	setup_unit("Île-aux-Noix", "Marine Detachment");

	setup_unit("Crown Point", "Marine Detachment");
	setup_unit("Crown Point", "Marin");

	setup_leader("Cataraqui", "Villiers");
	setup_unit("Cataraqui", "Marine Detachment");
	setup_unit("Cataraqui", "Léry");

	setup_unit("Niagara", "Marine Detachment");
	setup_unit("Niagara", "Joncaire");

	setup_unit("Presqu'île", "Marine Detachment");

	setup_unit("French Creek", "Marine Detachment");

	setup_unit("Venango", "Langlade");

	setup_leader("Ohio Forks", "Beaujeu");
	setup_leader("Ohio Forks", "Dumas");
	setup_unit("Ohio Forks", "Marine Detachment");
	setup_unit("Ohio Forks", "Ligneris");
	setup_unit("Ohio Forks", "Ottawa");
	setup_unit("Ohio Forks", "Potawatomi");

	setup_markers(game.Britain.forts, [
		"Hudson Carry South",
		"Will's Creek",
		"Oswego",
	]);
	setup_markers(game.Britain.stockades, [
		"Oneida Carry West",
		"Oneida Carry East",
		"Schenectady",
		"Hoosic",
		"Charlestown",
	]);

	setup_unit("Oswego", "New York");

	setup_leader("Albany", "Shirley");
	setup_leader("Albany", "Johnson");
	setup_unit("Albany", "Rhode Island");
	setup_unit("Albany", "Connecticut");
	setup_unit("Albany", "New Hampshire");
	setup_unit("Albany", "Massachusetts");
	setup_unit("Albany", "Massachusetts");
	setup_unit("Albany", "Mohawk");
	setup_unit("Albany", "Mohawk");

	setup_leader("Halifax", "Monckton");
	setup_unit("Halifax", "47th");

	setup_leader("Alexandria", "Braddock");
	setup_leader("Alexandria", "Dunbar");
	setup_unit("Alexandria", "44th");
	setup_unit("Alexandria", "48th");

	setup_unit("Will's Creek", "Virginia");
	setup_unit("Will's Creek", "Maryland");

	game.pieces.pool.push(find_leader("Abercromby"));
	game.pieces.pool.push(find_leader("Bradstreet"));
	game.pieces.pool.push(find_leader("Loudoun"));
	game.pieces.pool.push(find_leader("Murray"));
	game.pieces.pool.push(find_leader("Webb"));

	game.events.once_french_regulars = 1;

	start_year();

	return game;
}

exports.setup = function (seed, scenario, options) {
	load_game_state({
		seed: seed,
		state: null,
		active: FRANCE,
		tracks: {
			year: 1755,
			end_year: 1762,
			season: 0,
			vp: 0,
			pa: 0,
		},
		events: {},
		cards: {
			current: 0,
			draw_pile: [],
			discarded: [],
			removed: [],
		},
		pieces: {
			location: pieces.map(x => 0),
			reduced: [],
			inside: [],
			pool: [],
		},
		sieges: {},
		fieldworks: [],
		niagara: 1,
		ohio_forks: 1,
		France: {
			hand: [],
			held: 0,
			did_construct: 0,
			allied: [],
			stockades: [],
			forts_uc: [],
			forts: [],
			fortresses: originally_french_fortresses.slice(),
			raids: [],
		},
		Britain: {
			hand: [],
			held: 0,
			did_construct: 0,
			allied: [],
			stockades: [],
			forts_uc: [],
			forts: [],
			fortresses: originally_british_fortresses.slice(),
			raids: [],
			amphib: [],
		},

		undo: [],
		log: [],
	});

	switch (scenario) {
	default:
	case "Annus Mirabilis": return setup_1757(1759);
	case "Early War Campaign": return setup_1755(1759);
	case "Late War Campaign": return setup_1757(1762);
	case "The Full Campaign": return setup_1755(1762);
	}
}

// ACTION HANDLERS

function clear_undo() {
	game.undo = [];
}

function push_undo() {
	game.undo.push(JSON.stringify(game, (k,v) => {
		if (k === 'undo') return undefined;
		if (k === 'log') return v.length;
		return v;
	}));
}

function pop_undo() {
	let undo = game.undo;
	let save_log = game.log;
	Object.assign(game, JSON.parse(undo.pop()));
	game.undo = undo;
	save_log.length = game.log;
	game.log = save_log;
}

function gen_action_undo() {
	if (!view.actions)
		view.actions = {}
	if (game.undo && game.undo.length > 0)
		view.actions.undo = 1;
	else
		view.actions.undo = 0;
}

function gen_action_x(action, enabled) {
	if (!view.actions)
		view.actions = {}
	view.actions[action] = enabled ? 1 : 0;
}

function gen_action(action, argument) {
	if (!view.actions)
		view.actions = {}
	if (argument !== undefined) {
		if (!(action in view.actions)) {
			view.actions[action] = [ argument ];
		} else {
			if (!view.actions[action].includes(argument))
				view.actions[action].push(argument);
		}
	} else {
		view.actions[action] = 1;
	}
}

function gen_action_pass() {
	gen_action('pass');
}

function gen_action_next() {
	gen_action('next');
}

function gen_action_space(space) {
	gen_action('space', space);
}

function gen_action_piece(piece) {
	gen_action('piece', piece);
}

function gen_action_discard(card) {
	gen_action('card', card);
}

function load_game_state(state) {
	game = state;
	update_active_aliases();
}

exports.resign = function (state, current) {
	load_game_state(state);
	if (game.state !== 'game_over')
		goto_game_over(enemy(), current + " resigned.");
	return state;
}

exports.action = function (state, current, action, arg) {
	load_game_state(state);
	let S = states[game.state];
	if (action in S) {
		S[action](arg);
	} else {
		if (action === 'undo' && game.undo && game.undo.length > 0)
			pop_undo();
		else if (action === 'supply')
			goto_debug_supply(current);
		else
			throw new Error("Invalid action: " + action);
	}
	return state;
}

exports.view = function(state, current) {
	load_game_state(state);
	view = {
		tracks: game.tracks,
		events: game.events,
		pieces: game.pieces,
		sieges: game.sieges,
		fieldworks: game.fieldworks,
		markers: {
			France: {
				allied: game.France.allied,
				stockades: game.France.stockades,
				forts_uc: game.France.forts_uc,
				forts: game.France.forts,
				raids: game.France.raids,
			},
			Britain: {
				allied: game.Britain.allied,
				stockades: game.Britain.stockades,
				forts_uc: game.Britain.forts_uc,
				forts: game.Britain.forts,
				raids: game.Britain.raids,
				amphib: game.Britain.amphib,
			},
		},
		cards: {
			current: game.cards.current,
			draw_pile: game.cards.draw_pile.length,
			discarded: game.cards.discarded,
			removed: game.cards.removed,
		},
		active: game.active,
		prompt: null,
		actions: null,
		log: game.log,
	};

	if (game.activation)
		view.activation = game.activation;
	if (game.move)
		view.move = game.move;
	if (game.force)
		view.force = game.force;
	if (game.Britain.held)
		view.british_held = 1;
	if (game.France.held)
		view.french_held = 1;

	if (current === FRANCE)
		view.hand = game.France.hand;
	else if (current === BRITAIN)
		view.hand = game.Britain.hand;
	else
		view.hand = [];

	if (!states[game.state]) {
		view.prompt = "Invalid game state: " + game.state;
		return view;
	}

	if (current === 'Observer' || game.active !== current) {
		if (states[game.state].inactive)
			states[game.state].inactive();
		else
			view.prompt = `Waiting for ${game.active} \u2014 ${game.state.replace(/_/g, " ")}...`;
	} else {
		states[game.state].prompt();
		gen_action_undo();
		view.prompt = game.active + ": " + view.prompt;
	}

	return view;
}
