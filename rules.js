"use strict";

// INTERRUPT CARDS:
// Card 13 - Blockhouses (before enemy rolls on raid table)
// Card 14 - Foul Weather (when enemy is about to move)
// Card 15 - Lake Schooner (when enemy moves into friendly fortification along lake etc)

// TODO: show british leader pool
// TODO: show discard/removed card list in UI

// TODO: re-evaluate fortress ownership and VP when pieces move or are eliminated

// TODO: rename node/space -> location/space or raw_space/space or box/space?
// TODO: replace piece[p].type lookups with index range checks

// TODO: lift sieges/remove amphib after move/turn end

// TODO: voluntary DEMOLITION

// TODO: move core of is_friendly/enemy to is_british/french and branch in is_friendly/enemy

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

function roll_d6() {
	return random(6) + 1;
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

function enemy_of(role) {
	return role === FRANCE ? BRITAIN : FRANCE;
}

function set_active(new_active) {
	console.log("ACTIVE =", game.state, new_active);
	game.active = new_active;
	update_active_aliases();
}

function update_active_aliases() {
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

function set_enemy_active(new_state) {
	game.state = new_state;
	set_active(enemy());
}

// LISTS

const EARLY = 0;
const LATE = 1;

const RELUCTANT = 0;
const SUPPORTIVE = 1;
const ENTHUSIASTIC = 2;

function find_space(name) {
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

function exists_unused_unit(name) {
	for (let i = 0; i < pieces.length; ++i)
		if (pieces[i].name === name && game.pieces.location[i] === 0)
			return true;
	return 0;
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
	northern_indians: [
		"Kahnawake",
		"Lac des Deux Montagnes",
		"Mississauga",
		"St-François",
	].map(name => spaces.findIndex(space => space.name === name)),
	western_indians: [
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

const HALIFAX = find_space("Halifax");
const LOUISBOURG = find_space("Louisbourg");
const BAIE_ST_PAUL = find_space("Baie-St-Paul");
const RIVIERE_OUELLE = find_space("Rivière-Ouelle");
const ILE_D_ORLEANS = find_space("Île d'Orléans");
const QUEBEC = find_space("Québec");

const ST_LAWRENCE_CANADIAN_MILITIAS = find_space("St. Lawrence Canadian Militias");
const NORTHERN_COLONIAL_MILITIAS = find_space("Northern Colonial Militias");
const SOUTHERN_COLONIAL_MILITIAS = find_space("Southern Colonial Militias");

const first_amphib_card = 17;
const last_amphib_card = 20;
const SURRENDER = 6;
const LOUISBOURG_SQUADRONS = 21;

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
	// TODO: hand size (quiberon bay)
	let fn = game.France.hand_size - game.France.hand.length;
	let bn = game.Britain.hand_size - game.Britain.hand.length;

	log("Dealt " + fn + " cards to France.");
	log("Dealt " + bn + " cards to Britain.");

	while (fn > 0 && bn > 0) {
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
		game.pieces.pool.splice(i, 1);
		return p;
	}
	return 0;
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
	return pieces[p].name === tribe;
}

function indian_home_settlement(p) {
	return pieces[p].settlement || 0;
}

function is_regulars_unit(p) {
	return pieces[p].type === 'regulars';
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

function leader_tactics(p) {
	return pieces[p].tactics;
}

// DYNAMIC PROPERTIES

function piece_node(p) {
	return game.pieces.location[p];
}

function piece_space(p) {
	let where = piece_node(p);
	while (is_leader_box(where))
		where = piece_node(leader_box_leader(where));
	return where;
}

// commanding leader or self
function piece_force(self) {
	let force = self;
	let where = piece_node(force);
	while (is_leader_box(where)) {
		force = leader_box_leader(where);
		where = piece_node(force);
	}
	return force;
}

// is piece commanded by a leader (or self)
function is_piece_in_force(self, query) {
	let force = self;
	if (force === query)
		return true;
	let where = piece_node(force);
	while (is_leader_box(where)) {
		force = leader_box_leader(where);
		if (force === query)
			return true;
		where = piece_node(force);
	}
	return false;
}

function count_non_british_iroquois_and_mohawk_units_in_leader_box(leader) {
	let n = 0;
	for_each_friendly_piece_in_node(leader_box(leader), p => {
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

function is_piece_activated(p) {
	return game.pieces.activated.includes(p);
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
	// TODO: do we need to flatten forces inside a fort?
	if (is_leader(force)) {
		for_each_unit_in_force(force, p => {
			isolate_piece_from_force(p);
			set_piece_inside(p);
		});
		for_each_piece_in_force(force, p => {
			isolate_piece_from_force(p);
			set_piece_inside(p);
		});
	} else {
		set_piece_inside(force);
	}
}

function is_piece_on_map(p) {
	// TODO: militia boxes?
	return piece_node(p) > 0;
}

function is_unit_unused(p) {
	// TODO: permanently eliminated
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

function has_friendly_fortress(space) {
	return is_fortress(space) && is_friendly_controlled_space(space);
}

function has_enemy_fortress(space) {
	return is_fortress(space) && is_enemy_controlled_space(space);
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
	if (is_space_unbesieged(space) && !has_british_units(space)) {
		if (is_originally_british(space)) {
			if (has_french_units(space))
				return true;
		} else {
			// TODO: neutral spaces?
			return true;
		}
	}
	return false;
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

function has_french_fortification(space) {
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

function has_unbesieged_enemy_units(space) {
	for (let p = first_enemy_unit; p <= last_enemy_unit; ++p)
		if (is_piece_in_space(p, space) && !is_piece_inside(p))
			return true;
	return false;
}

function is_friendly_controlled_space(space) {
	if (is_space_unbesieged(space) && !has_enemy_units(space)) {
		if (is_originally_enemy(space)) {
			if (has_friendly_units(space))
				return true;
			if (has_friendly_amphib(space))
				return true;
		} else {
			// TODO: neutral spaces?
			// return !is_originally_friendly(space);
			return true;
		}
	}
	return false;
}

function is_enemy_controlled_space(space) {
	if (is_space_unbesieged(space) && !has_friendly_units(space)) {
		if (is_originally_friendly(space)) {
			if (has_enemy_units(space))
				return true;
			if (has_enemy_amphib(space))
				return true;
		} else {
			// TODO: neutral spaces?
			// return !is_originally_enemy(space);
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

function has_unbesieged_friendly_units(space) {
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
		if (is_piece_in_space(p, space) && !is_piece_inside(p))
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
	return is_leader(who) && count_pieces_in_force(who) === 0;
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
	return piece_space(moving_piece());
}

function intercepting_piece() {
	return game.move.intercepting;
}

function avoiding_piece() {
	return game.move.avoiding;
}

function moving_piece_came_from(here) {
	return game.move.path[here];
}

function battle_space() {
	return game.battle.where;
}

function find_friendly_commanding_leader_in_space(space) {
	let commander = 0;
	for (let p = first_friendly_leader; p <= last_friendly_leader; ++p)
		if (is_piece_in_space(p, space))
			if (!commander || leader_command(p) > leader_command(commander))
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

function award_vp(n) {
	if (game.active === FRANCE) {
		log(`France gains ${n} VP.`);
		game.tracks.vp += n;
	} else {
		log(`Britain gains ${n} VP.`);
		game.tracks.vp -= n;
	}
}

function remove_friendly_stockade(space) {
	remove_from_array(player.stockades, space);
}

function remove_friendly_fort_uc(space) {
	remove_from_array(player.forts_uc, space);
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
function isolate_piece_from_force(p) {
	let where = piece_space(p);
	if (is_leader(p))
		move_pieces_from_node_to_node(leader_box(p), where);
	move_piece_to(p, where);
}

function reduce_unit(p) {
	if (is_unit_reduced(p)) {
		eliminate_piece(p);
		return true;
	}
	set_unit_reduced(p, 1);
	log(piece_name(p) + " is reduced.")
	return false;
}

function eliminate_piece(p) {
	log(piece_name(p) + " is eliminated.");
	isolate_piece_from_force(p);
	if (is_indian_unit(p)) {
		// TODO: remove allied marker if necessary
	}
	game.pieces.location[p] = 0;
}

function eliminate_indian_tribe(tribe) {
	for (let p = first_enemy_unit; p <= last_enemy_unit; ++p)
		if (is_indian_tribe(p, tribe) && is_piece_unbesieged(p))
			eliminate_piece(p);
}

function move_piece_to(who, to) {
	game.pieces.location[who] = to;
}

function move_pieces_from_node_to_node(from, to) {
	for (let p = 0; p < pieces.length; ++p) {
		if (piece_node(p) === from)
			move_piece_to(p, to);
	}
}

function capture_enemy_fortress(space) {
	log("captures fortress");
	award_vp(3);
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

// PATH FINDING

function is_in_supply(space) {
	// TODO: trace supply
	return true;
}

function list_intercept_spaces(is_lone_ld, is_lone_ax) {
	let intercept = {};

	// 6.723 Leaders moving alone can NOT be intercepted
	if (is_lone_ld)
		return intercept;

	console.log("INTERCEPT SEARCH is_lone_ax=", is_lone_ax);

	for (let from = first_space; from <= last_space; ++from) {
		if (has_unbesieged_enemy_units(from)) {
			console.log("INTERCEPT FROM", space_name(from));

			// 6.721 exception -- can always intercept units infiltrating same space
			// TODO: infiltration
			// intercept[from] = 3;

			for_each_exit(from, to => {
				// 6.722
				if (has_unbesieged_friendly_units(to))
					return;
				if (has_unbesieged_friendly_fortifications(to))
					return;

				// 6.721
				if (is_lone_ax && is_wilderness_or_mountain(to)) {
					if (has_unbesieged_enemy_auxiliary(from)) {
						console.log("INTERCEPT TO", space_name(to), "(lone ax)");
						intercept[to] = 2;
					}
				} else {
					console.log("INTERCEPT TO", space_name(to));
					intercept[to] = 1;
				}
			});
		}
	}

	return intercept;
}

function gen_intercept(is_lone_ax, to) {
	if (has_unbesieged_enemy_units(to)) {
		// 6.721 exception -- can always intercept units infiltrating same space
		// TODO: infiltration
		/*
		for_each_friendly_piece_in_space(to, p => {
			// TODO: unbesieged
			gen_action_piece(p);
		});
		 */

		for_each_exit(to, from => {
			// 6.721
			if (is_lone_ax && is_wilderness_or_mountain(to)) {
				let has_ax = false;
				let has_br_indians = false;
				for_each_friendly_unit_in_space(from, p => {
					// TODO: unbesieged
					if (is_auxiliary_unit(p)) {
						gen_action_piece(p);
						if (is_british_iroquois_or_mohawk(p))
							has_br_indians = true;
						else
							has_ax = true;
					}
				});
				// allow leaders to accompany intercepting auxiliary unit
				if (has_ax) {
					for_each_friendly_leader_in_space(from, p => {
						// TODO: unbesieged
						gen_action_piece(p);
					});
				} else if (has_br_indians) {
					if (is_piece_in_space(JOHNSON, from)) {
						// TODO: unbesieged
						gen_action_piece(JOHNSON);
					}
				}
			} else {
				for_each_friendly_piece_in_space(from, p => {
					// TODO: unbesieged
					gen_action_piece(p);
				});
			}
		});
	}
}

function search_naval_move(who, start_space, start_cost) {
	let move_cost = game.move.cost = {};
	let move_path = game.move.path = {};
	let candidates = (game.active === FRANCE) ? french_ports : ports;

	if (start_cost > 0)
		return;

	let from = piece_space(who);

	if (!candidates.includes(from) || !is_friendly_controlled_space(from))
		return;

	game.move.path[from] = null;
	candidates.forEach(space => {
		if (space === from)
			return;
		if (is_friendly_controlled_space(space)) {
			game.move.cost[space] = 1;
			game.move.path[space] = from;
		}
	})
}

// Use Breadth First Search to find all paths.

function pq_push(queue, item, prio) {
	// TODO: reprioritize if item is already in the queue
	for (let i = 0, n = queue.length; i < n; ++i)
		if (queue[i].prio > prio)
			return queue.splice(i, 0, [prio, item]);
	queue.push([prio, item])
}

function pq_pop(queue) {
	return queue.shift()[1];
}

function search_boat_move(who, start_space, start_cost, max_cost) {
	max_cost *= 2; // use odd numbers for paths with one land connection

	let move_cost = game.move.cost = {};
	let move_path = game.move.path = {};

	if (start_cost >= max_cost)
		return;

	let queue = [];
	pq_push(queue, start_space, 0);
	move_cost[start_space] = start_cost;
	move_path[start_space] = null;

	const is_lone_ld = is_lone_leader(who);
	const has_dt = force_has_drilled_troops(who);

	while (queue.length > 0) {
		let current = pq_pop(queue);
		let c_cost = move_cost[current];
		let c_ff = has_friendly_fortifications(current) || is_originally_friendly(current);
		for_each_exit(current, (next, connection) => {
			let n_ff = has_friendly_fortifications(next) || is_originally_friendly(next);
			let n_cost = c_cost + 2;
			let must_stop = false;

			if (connection === 'land') {
				if (c_ff && n_ff && (c_cost & 1) === 0) {
					n_cost += 1;
				} else {
					return; // Not a usable land connection
				}
			}

			// Must stop on entering interception space
			if (next in game.move.intercept)
				must_stop = true;

			// Must stop on entering enemy occupied spaces
			if (has_unbesieged_enemy_units(next)) {
				if (is_lone_ld)
					return; // Lone leaders can never enter an enemy occupied space
				// TODO: Infiltration
				must_stop = true; // May continue if over-run
			}

			if (has_enemy_stockade(next)) {
				// TODO: Infiltration
				n_cost = 18; // may not continue
			}

			if (has_unbesieged_enemy_fort_or_fortress(next)) {
				if (!has_dt)
					return; // Must have Drilled Troops to enter an enemy fort or fortress space.
				// TODO: Infiltration
				n_cost = 18; // may not continue
			}

			// No movement points left.
			if (n_cost >= max_cost)
				must_stop = true;

			console.log("SEARCH BOAT MOVE", space_name(current), ">", space_name(next), c_cost, n_cost);

			if (!(next in move_cost) || (n_cost < move_cost[next])) {
				move_cost[next] = n_cost;
				move_path[next] = current;
				if (!must_stop)
					pq_push(queue, next, n_cost);
			}

		});
	}
}

function search_land_move(who, start_space, start_cost, max_cost) {
	let move_cost = game.move.cost = {};
	let move_path = game.move.path = {};

	if (start_cost >= max_cost)
		return;

	let queue = [];
	pq_push(queue, start_space, 0);
	move_cost[start_space] = start_cost;
	move_path[start_space] = null;

	const is_lone_ld = is_lone_leader(who);
	const has_dt = force_has_drilled_troops(who);
	const has_ax = force_has_auxiliary_unit(who);

	while (queue.length > 0) {
		let current = pq_pop(queue);
		let c_cost = move_cost[current];
		let c_ff = has_friendly_fortifications(current);
		for_each_exit(current, (next, connection) => {
			let n_ff = has_friendly_fortifications(next);
			let n_cost = c_cost + 1;
			let must_stop = false;

			// Must stop on mountains.
			if (is_mountain(next) && !n_ff)
				n_cost = 9; // may not continue

			// Must stop in the next space after passing through...
			if (current !== game.move.start_space && !c_ff) {
				// Drilled Troops that pass through wilderness must stop in the next space.
				if (has_dt && !has_ax && is_wilderness(current))
					n_cost = 9; // may not continue

				// Auxiliaries that pass through enemy cultivated must stop in the next space.
				if (has_ax && !has_dt && is_originally_enemy(current))
					n_cost = 9; // may not continue
			}

			// Must stop on entering interception space
			if (next in game.move.intercept)
				must_stop = true;

			// Must stop on entering enemy occupied spaces
			if (has_unbesieged_enemy_units(next)) {
				if (is_lone_ld)
					return; // Lone leaders can never enter an enemy occupied space
				// TODO: Infiltration
				must_stop = true; // May continue if over-run
			}

			if (has_enemy_stockade(next)) {
				// TODO: Infiltration
				n_cost = 9; // may not continue
			}

			if (has_unbesieged_enemy_fort_or_fortress(next)) {
				if (!has_dt)
					return; // Must have Drilled Troops to enter an enemy fort or fortress space.
				// TODO: Infiltration
				n_cost = 9; // may not continue
			}

			// No movement points left.
			if (n_cost >= max_cost)
				must_stop = true;

			console.log("SEARCH LAND MOVE", space_name(current), ">", space_name(next), c_cost, n_cost, must_stop);

			if (!(next in move_cost) || (n_cost < move_cost[next])) {
				move_cost[next] = n_cost;
				move_path[next] = current;
				if (!must_stop)
					pq_push(queue, next, n_cost);
			}
		});
	}
}

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
		game.pieces.pool.push(find_leader("Amherst"));
		game.pieces.pool.push(find_leader("Forbes"));
		game.pieces.pool.push(find_leader("Wolfe"));
		setup_leader("Amherst", "Amherst");
		setup_leader("Forbes", "Forbes");
		setup_leader("Wolfe", "Wolfe");
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
	game.pieces.activated.length = 0;
	game.count = 0;
	// TODO: skip if next player has no cards or passed
	// TODO: end season
	set_active(enemy());
	start_action_phase();
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
			return event.can_play();
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
	log(`${game.active} plays ${card_name(card)}.`);
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
	log(`${game.active} discards ${card_name(card)}${reason}.`);
	remove_from_array(player.hand, card);
	game.cards.current = card;
	if (card === SURRENDER)
		game.events.surrender = 1;
	if (cards[card].special === 'remove')
		game.cards.removed.push(card);
	else
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
	},
	play_event(card) {
		push_undo();
		player.did_construct = 0;
		play_card(card);
		events[cards[card].event].play();
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
		// TODO: can you build fortifications, pass, then build next turn?
		log(game.active + " pass.");
		game.passed = game.active;
		end_action_phase();
	},
}

// ACTIVATION

function goto_activate_individually(card) {
	push_undo();
	player.did_construct = 0;
	discard_card(card, " to activate auxiliaries and leaders");
	game.count = cards[card].activation;
	game.state = 'activate_individually';
}

function goto_activate_force(card) {
	push_undo();
	player.did_construct = 0;
	discard_card(card, " to activate a force");
	game.state = 'activate_force';
	game.count = cards[card].activation;
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
							if (game.pieces.activated.length === 0)
								gen_action_piece(p);
					}
				}
			}
		}
	},
	piece(piece) {
		push_undo();
		log(`Activate ${piece_name(piece)}.`);
		isolate_piece_from_force(piece);
		game.pieces.activated.push(piece);
		if (is_drilled_troops(piece))
			game.count = 0;
		else if (is_indian_unit(piece))
			game.count -= 0.5;
		else
			game.count -= 1.0;
	},
	next() {
		goto_pick_move();
	},
}

states.activate_force = {
	prompt() {
		gen_action_pass();
		if (game.count > 0) {
			view.prompt = "Activate a Force.";
			for (let p = first_friendly_leader; p <= last_friendly_leader; ++p) {
				if (is_piece_on_map(p) && leader_initiative(p) <= game.count)
					gen_action_piece(p);
			}
		} else {
			view.prompt = "Activate a Force \u2014 done.";
		}
	},
	piece(leader) {
		push_undo();
		log(`Activate force led by ${piece_name(leader)}.`);
		game.pieces.activated.push(leader);
		game.count = 0;
		goto_pick_force();
	},
	pass() {
		end_action_phase();
	},
}

function is_vacant_of_besieging_units(space) {
	if (has_french_fort(space) || has_french_fortress(space))
		return !has_french_units(space);
	else
		return !has_british_units(space);
}

function lift_sieges_and_amphib() {
	console.log("LIFT SIEGES AND AMPHIB");

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
}

function end_activation() {
	lift_sieges_and_amphib();
	clear_undo();
	// TODO: goto_pick_force for campaign event
	goto_pick_move();
}

function goto_pick_force() {
	if (game.pieces.activated.length === 0) {
		end_action_phase();
	} else if (game.pieces.activated.length === 1) {
		let leader = game.pieces.activated.pop();
		game.force = {
			leader: leader,
			selected: leader,
			reason: 'move',
		};
		game.state = 'define_force';
	} else {
		// TODO: for campaign event
		game.state = 'pick_force';
	}
}

function goto_pick_move() {
	if (game.pieces.activated.length === 0)
		end_action_phase();
	else if (game.pieces.activated.length === 1)
		goto_move_piece(game.pieces.activated[0])
	else {
		game.state = 'pick_move';
	}
}

states.pick_move = {
	prompt() {
		view.prompt = "Select an activated force, leader, or unit to move."
		gen_action_next();
		game.pieces.activated.forEach(gen_action_piece);
	},
	piece(piece) {
		push_undo();
		goto_move_piece(piece);
	},
	next() {
		end_action_phase();
	},
}

// DEFINE FORCE (for various actions)

states.define_force = {
	prompt() {
		let main_leader = game.force.leader;
		let selected = game.force.selected;
		let space = piece_space(main_leader);

		// 5.534 Johnson commands British Iroquois and Mohawk units for free
		let cap = leader_command(main_leader) - count_non_british_iroquois_and_mohawk_units_in_leader_box(selected);

		view.prompt = `Define the force to ${game.force.reason} with ${piece_name(main_leader)} from ${space_name(space)}.`;
		view.prompt += " (" + piece_name(selected) + ")";
		view.who = selected;

		gen_action_next();

		// Short-cut to Siege/Assault if activated force is highest commanding leader in space.
		if (game.force.reason === 'move' && has_besieged_enemy_fortifications(space)) {
			let commanding = find_friendly_commanding_leader_in_space(space);
			if (main_leader === commanding && has_friendly_supplied_drilled_troops(space)) {
				// TODO: gen_action_space(space);
				if (is_assault_possible(space))
					gen_action('assault');
				else
					gen_action('siege');
			}
		}

		// select any leader in the map space
		for_each_friendly_leader_in_space(space, p => {
			if (p !== selected) {
				gen_action_space(leader_box(p));
				// XXX if (p !== main_leader && leader_command(p) <= leader_command(selected))
				// XXX gen_action_piece(p);
			}
		});

		// pick up subordinate leaders
		for_each_friendly_leader_in_node(space, p => {
			if (p !== selected) {
				if (p !== main_leader && leader_command(p) <= leader_command(selected))
					gen_action_piece(p);
			}
		});

		// drop off subordinate leaders
		for_each_friendly_leader_in_node(leader_box(selected), p => {
			if (p !== selected) {
				gen_action_piece(p);
			}
		});

		// pick up units
		for_each_friendly_unit_in_node(space, p => {
			if (is_british_iroquois_or_mohawk(p)) {
				// 5.534 Only Johnson can command British Iroquois and Mohawk (and for free)
				if (selected === JOHNSON)
					gen_action_piece(p);
			} else {
				if (cap > 0)
					gen_action_piece(p);
			}
		});

		// drop off units
		for_each_friendly_unit_in_node(leader_box(selected), p => {
			gen_action_piece(p);
		});
	},

	piece(piece) {
		push_undo();
		let main_leader = game.force.leader;
		let selected = game.force.selected;
		let space = piece_space(main_leader);
		if (piece_node(piece) === leader_box(selected))
			move_piece_to(piece, space);
		else
			move_piece_to(piece, leader_box(selected));
	},

	space(space) {
		push_undo();
		game.force.selected = leader_box_leader(space);
	},

	siege() {
		push_undo();
		let where = piece_space(game.force.leader);
		delete game.force;
		goto_resolve_siege(where);
	},

	assault() {
		push_undo();
		let where = piece_space(game.force.leader);
		delete game.force;
		goto_assault(where);
	},

	next() {
		push_undo();
		let main_leader = game.force.leader;
		let reason = game.force.reason;
		delete game.force;
		if (reason === 'move') {
			goto_move_piece(main_leader);
		} else if (reason === 'intercept' ) {
			attempt_intercept();
		} else if (reason === 'avoid' ) {
			attempt_avoid_battle();
		} else if (reason === 'retreat_defender' ) {
			game.state = 'retreat_defender';
		} else {
			throw Error("unknown reason state: " + game.reason);
		}
	},
}

// MOVE

function goto_move_piece(who) {
	log(`Move ${piece_name(who)}.`);
	remove_from_array(game.pieces.activated, who);
	let from = piece_space(who);
console.log("GOTO_MOVE_PIECE", who);
	game.state = 'move';
	game.move = {
		moving: who,
		intercepting: null,
		intercepted: [],
		did_attempt_intercept: 0,
		avoiding: null,
		avoided: [],
		start_space: from,
		start_cost: 0,
		type: is_only_port_space(from) ? 'naval' : 'land',
		cost: null,
		path: null,
	};
	game.raid = {
		where: 0,
		battle: 0,
		from: {},
		aux: list_auxiliary_units_in_force(who)
	}
	if (is_piece_inside(who))
		goto_break_siege();
	else
		resume_move();
}

function goto_break_siege() {
	console.log("GOTO_BREAK_SIEGE");
	let here = moving_piece_space();
	game.move.path = { [here]: here };
	goto_avoid_battle();
}

function may_naval_move(who) {
	if (game.active === FRANCE && game.no_fr_naval)
		return false;
	if (is_leader(who) && count_pieces_in_force(who) > 0)
		return cards[game.cards.current].activation === 3;
	return true;
}

function resume_move() {
	if (game.move.type === null) {
		game.move.cost = {};
		game.move.path = {};
		throw Error("WHAT IS THIS");
	}

	let who = moving_piece();

	const is_lone_ax = is_lone_auxiliary(who);
	const is_lone_ld = is_lone_leader(who);
console.log("RESUME_MOVE_UNIT is_lone_ax=" + is_lone_ax + " is_lone_ld=" + is_lone_ld);
	game.move.intercept = list_intercept_spaces(is_lone_ld, is_lone_ax);

	switch (game.move.type) {
	case 'boat':
		search_boat_move(who, piece_space(who), game.move.start_cost, 9);
		break;
	case 'land':
		search_land_move(who, piece_space(who), game.move.start_cost, movement_allowance(who));
		break;
	case 'naval':
		if (may_naval_move(who))
			search_naval_move(who, piece_space(who), game.move.start_cost);
		break;
	}
}

function print_path(path, destination, first) {
	function print_path_rec(prev, next) {
		if (path[prev] !== null)
			print_path_rec(path[prev], prev);
		else if (first)
			log("moves from " + space_name(prev));
		log("moves to " + space_name(next));
	}
	print_path_rec(path[destination], destination);
}

function remove_enemy_forts_uc_in_path(path, space) {
	for (;;) {
		if (has_enemy_fort_uc(space)) {
			log(`remove fort u/c in ${space_name(space)}`);
			remove_enemy_fort_uc(space);
		}
		let next = path[space];
		if (next === null)
			break;
		space = next;
	}
}

states.move = {
	prompt() {
		let who = moving_piece();
		let from = piece_space(who);
		view.prompt = "Move " + piece_name(who) + ".";
		view.who = who;
		switch (game.move.type) {
		default: view.prompt += " Select a movement type."; break;
		case 'boat': view.prompt += " (boat)"; break;
		case 'land': view.prompt += " (land)"; break;
		case 'naval': view.prompt += " (naval)"; break;
		}
		if (game.move.start_cost === 0) {
			if (!is_only_port_space(from)) {
				gen_action_x('boat_move', game.move.type !== 'boat');
				gen_action_x('land_move', game.move.type !== 'land');
			}
			if (is_port(from)) {
				// TODO: check valid destinations too
				if (may_naval_move(who))
					gen_action_x('naval_move', game.move.type !== 'naval');
				if (!game.events.no_amphib) {
					if (game.active === BRITAIN && has_amphibious_arrow(from)) {
						for (let card = first_amphib_card; card <= last_amphib_card; ++card)
							if (player.hand.includes(card))
								gen_action('play_event', card);
					}
				}
			}
		}
		gen_action_next();
		if (game.move.cost) {
			for (let space_id in game.move.cost) {
				space_id = space_id | 0;
				if (space_id !== from)
					gen_action_space(space_id);
			}
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
		game.state = 'amphibious_landing';
	},
	boat_move() {
		game.move.type = 'boat';
		resume_move();
	},
	land_move() {
		game.move.type = 'land';
		resume_move();
	},
	naval_move() {
		game.move.type = 'naval';
		resume_move();
	},
	space(to) {
		push_undo();
		print_path(game.move.path, to, game.move.start_cost === 0);
		let who = moving_piece();
		let cost = game.move.cost[to];
		game.move.start_cost = game.move.cost[to];

		// remember where we came from so we can retreat after battle
		game.raid.from[to] = game.move.path[to];

		// TODO: except space moved into, if it is guarded!
		if (force_has_drilled_troops(who))
			remove_enemy_forts_uc_in_path(game.move.path, to);

		move_piece_to(who, to);
		lift_sieges_and_amphib();
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
	next() {
		// TODO
		end_move();
	},
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
		game.move.start_cost = 1;
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
	game.sieges[where] = 0;
}

function change_siege_marker(where, amount) {
	return game.sieges[where] = clamp(game.sieges[where] + amount, 0, 2);
}

function goto_battle_check() {
	let where = moving_piece_space();
	console.log("BATTLE CHECK", space_name(where));
	if (has_unbesieged_enemy_units(where)) {
		// TODO: breaking the siege (units inside join)
		goto_battle(where, false, false);
	} else {
		end_move_step(false);
	}
}

function end_move_step(final) {
	lift_sieges_and_amphib();
	let who = moving_piece();
	let where = moving_piece_space();
	console.log("END MOVE STEP");
	delete game.battle;
	game.move.did_attempt_intercept = 0; // reset flag for next move step
	if (has_unbesieged_enemy_fortifications(where)) {
		if (has_enemy_fort(where) || is_fortress(where)) {
			place_siege_marker(where);
		}
		if (has_enemy_stockade(where)) {
			if (force_has_drilled_troops(who)) {
				capture_enemy_stockade(where)
			}
		}
		end_move();
	} else if (final) {
		end_move();
	} else {
		resume_move();
	}
}

function end_move() {
	let who = moving_piece();

	console.log("END MOVE");
	delete game.move;

	game.raid.list = [];
	for (let i = 0; i < game.raid.aux.length; ++i)
		add_raid(game.raid.aux[i]);

	goto_pick_raid();
}

// INTERCEPT

function goto_intercept() {
	let where = moving_piece_space();
	if (where in game.move.intercept) {
		clear_undo();
		set_enemy_active('intercept_who');
	} else {
		goto_declare_inside(where);
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
		let where = piece_space(who);
		let is_lone_ax = is_lone_auxiliary(who);
		view.prompt = "Select a force or unit to intercept into " + space_name(where) + ".";
		view.where = where;
		gen_action_pass();
		gen_intercept(is_lone_ax, where);
	},
	piece(piece) {
		console.log("INTERCEPT WITH", piece_name(piece));
		if (is_leader(piece)) {
			push_undo();
			game.move.intercepting = piece;
			game.force = {
				leader: piece,
				selected: piece,
				reason: 'intercept',
			};
			if (is_moving_piece_lone_ax_in_wilderness_or_mountain())
				game.state = 'define_force_lone_ax'; // TODO
			else
				game.state = 'define_force';
		} else {
			game.move.intercepting = piece;
			attempt_intercept();
		}
	},
	pass() {
		log(`${game.active} decline to intercept`);
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

	let roll = roll_d6();
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
	set_enemy_active('move');
	goto_declare_inside();
}

function end_intercept_success() {
	let who = intercepting_piece();
	let to = moving_piece_space();
	console.log("INTERCEPT SUCCESS " + piece_name(who) + " TO " + space_name(to));
	move_piece_to(who, to);
	set_enemy_active('move');
	goto_declare_inside();
}

// DECLARE INSIDE/OUTSIDE FORTIFICATION

function has_unbesieged_enemy_units_that_did_not_intercept(where) {
	// TODO
	return has_unbesieged_enemy_units(where);
}

function goto_declare_inside() {
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
		isolate_piece_from_force(piece);
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

function did_piece_intercept(piece) {
	return game.move.intercepted.includes(piece);
}

function did_piece_avoid_battle(piece) {
	return game.move.avoided.includes(piece);
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
				leader: piece,
				selected: piece,
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

	let roll = roll_d6();
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
		if ((moving_piece_came_from(from) !== to)
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
			if ((moving_piece_came_from(from) !== to)
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
	console.log("END AVOID BATTLE");
	set_enemy_active('move');
	goto_battle_check();
}

// BATTLE

function for_each_attacking_piece(fn) {
	for_each_piece_in_force(game.move.moving, fn);
	/*
	let where = game.battle.where;
	if (game.battle.breaking_siege) {
	} else {
		if (game.battle.attacker === BRITAIN) {
			for (let p = first_british_piece; p <= last_british_piece; ++p)
				if (is_piece_unbesieged(p) && is_piece_in_space(p, where))
					fn(p);
		} else {
			for (let p = first_french_piece; p <= last_french_piece; ++p)
				if (is_piece_unbesieged(p) && is_piece_in_space(p, where))
					fn(p);
		}
	}
	*/
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
	[ 28, [ 3, 4, 5, 5, 6, 6, 7, 8 ]],
]

function combat_result(str, die) {
	die = clamp(die, 0, 7);
	str = clamp(str, 0, 28);
	for (let i = 0; i < COMBAT_RESULT_TABLE.length; ++i)
		if (str <= COMBAT_RESULT_TABLE[i][0])
			return COMBAT_RESULT_TABLE[i][1][die];
	return NaN;
}

function goto_battle(where, is_assault=false, is_breaking_siege=false) {
	clear_undo();

	game.battle = {
		where: where,
		attacker: game.active,
		defender: enemy(),
		assault: is_assault,
		breaking_siege: is_breaking_siege,
	};

	if (game.raid)
		game.raid.battle = where;

	log("BATTLE IN " + space_name(where));

	// No Militia take part in assaults
	if (!game.battle.assault)
		goto_battle_militia();
	else
		goto_battle_events();
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
				return goto_battle_events();
		game.state = 'militia_in_battle';
	} else {
		goto_battle_events();
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
		goto_battle_events();
	},
}

function goto_battle_events() {
	set_active(game.battle.attacker);
	// TODO: attacker then defender play events
	// TODO: attacker MAY participate besieged units if breaking the siege
	goto_battle_roll();
}

function goto_battle_roll() {
	// TODO: modifiers
	let atk_str = attacker_combat_strength();
	let atk_mod = 0;
	game.battle.atk_roll = roll_d6();
	game.battle.atk_result = combat_result(atk_str, game.battle.atk_roll + atk_mod);
	log("ATTACKER", "str="+atk_str, "roll="+game.battle.atk_roll, "+", atk_mod, "=", game.battle.atk_result);

	// TODO: modifiers
	let def_str = defender_combat_strength();
	let def_mod = 0;
	game.battle.def_roll = roll_d6();
	game.battle.def_result = combat_result(def_str, game.battle.def_roll + def_mod);
	log("DEFENDER", "str="+def_str, "roll="+game.battle.def_roll, "+", def_mod, "=", game.battle.def_result);

	// Next state sequence:
	//   atk step losses
	//     atk leader checks
	//   def step losses
	//     def leader checks
	//   determine winner

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
	if (game.active === game.battle.attacker)
		goto_def_step_losses();
	else
		goto_determine_winner();
}

// STEP LOSSES

function goto_atk_step_losses() {
	set_active(game.battle.attacker);
	if (game.battle.def_result > 0) {
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
		if (reduce_unit(p))
			remove_from_array(game.battle.units, p);
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
	if ((game.battle.def_result > 0) && (game.battle.def_roll === 1 || game.battle.def_roll === 6)) {
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
	if ((game.battle.atk_result > 0) && (game.battle.atk_roll === 1 || game.battle.atk_roll === 6)) {
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
		if (game.battle.leader_check.length === 0)
			gen_action_next();
	},
	piece(piece) {
		let die = roll_d6();
		if (die === 1) {
			log(`${piece_name(piece)} rolls ${die} and is killed`);
			eliminate_piece(piece);
		} else {
			log(`${piece_name(piece)} rolls ${die} and survives`);
		}
		remove_from_array(game.battle.leader_check, piece);
	},
	next() {
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
			game.state = 'leader_check';
		} else {
			game.raid.leader_check = 0;
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
		if (game.raid.leader_check.length === 0)
			gen_action_next();
	},
	piece(piece) {
		let die = roll_d6();
		if (die === 1) {
			log(`${piece_name(piece)} rolls ${die} and is killed`);
			eliminate_piece(piece);
		} else {
			log(`${piece_name(piece)} rolls ${die} and survives`);
		}
		remove_from_array(game.raid.leader_check, piece);
	},
	next() {
		delete game.raid.leader_check;
		raiders_go_home();
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

	// 7.8: Determine winner
	let atk_surv = count_friendly_units_in_space(where);
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

	// TODO: 7.64 leaders retreat if all units lost

	// TODO: 7.8: Award vp

	return_militia(game.battle.where);

	// Raid battle vs militia
	if (game.raid && game.raid.where > 0) {
		if (victor === game.battle.attacker) {
			log("ATTACKER WON RAID BATTLE VS MILITIA");
			resolve_raid();
		} else {
			log("DEFENDER WON RAID BATTLE VS MILITIA");
			retreat_attacker(game.raid.where, game.raid.from[game.raid.where] | 0);
		}
		return;
	}

	// TODO: Breakout

	// Normal battle
	if (victor === game.battle.attacker) {
		log("ATTACKER WON");
		if (has_unbesieged_enemy_units(where)) {
			goto_retreat_defender();
		} else {
			if (def_surv === 0 && game.battle.def_result === 0) {
				console.log("POSSIBLE OVERRUN");
				end_move_step(false);
			} else {
				end_move_step(true);
			}
		}
	} else {
		log("DEFENDER WON");
		let from = game.battle.where;
		let to = moving_piece_came_from(game.battle.where);
		retreat_attacker(from, to);
	}
}

function eliminate_enemy_pieces_inside(where) {
	for (let p = first_enemy_piece; p <= last_enemy_piece; ++p)
		if (is_piece_in_space(where) && is_piece_inside(p))
			eliminate_piece(p);
}

function determine_winner_assault() {
	let where = game.battle.where;
	let victor;

	if (game.battle.atk_result > game.battle.def_result)
		victor = game.battle.attacker;
	else
		victor = game.battle.defender;

	if (victor === game.battle.attacker) {
		log("ATTACKER WON ASSAULT");
		eliminate_enemy_pieces_inside(where);
		remove_siege_marker(where);
		if (has_enemy_fortress(where)) {
			capture_enemy_fortress(where);
		}
		if (has_enemy_fort(where)) {
			capture_enemy_fort(where);
		}
	} else {
		log("DEFENDER WON ASSAULT");
	}

	end_activation();
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

		// NOTE: Besieged pieces assaulting out are already inside so not affected by the code below.
		// NOTE: We unstack forces here by retreating individual units before leaders!
		for_each_friendly_unit_in_space(from, p => {
			if (!is_piece_inside(p)) {
				if (can_attacker_retreat_from_to(p, from, to))
					move_piece_to(p, to);
				else
					eliminate_piece(p);
			}
		});
		for_each_friendly_leader_in_space(from, p => {
			if (!is_piece_inside(p)) {
				if (can_attacker_retreat_from_to(p, from, to))
					move_piece_to(p, to);
				else
					eliminate_piece(p);
			}
		});

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
}

function goto_retreat_defender() {
	set_active(game.battle.defender);
	let from = battle_space();
	let commander = find_friendly_commanding_leader_in_space(from);
	if (commander && has_friendly_units(from)) {
		game.force = {
			leader: commander,
			selected: commander,
			reason: 'retreat_defender',
		};
		game.state = 'define_force';
	} else {
		game.state = 'retreat_defender';
	}
}

function can_defender_retreat_from_to(p, from, to) {
	console.log("RETREAT QUERY", piece_name(p), space_name(from), space_name(to), "atk came from", moving_piece_came_from(from));
	if (has_unbesieged_enemy_units(to))
		return false;
	if (has_unbesieged_enemy_fortifications(to))
		return false;
	if (moving_piece_came_from(from) === to)
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
		// TODO: eliminate non-retreated units
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

// SIEGE

const SIEGE_TABLE = [ 0, 0, 0, 1, 1, 1, 2, 2 ];

function goto_resolve_siege(space) {
	// TODO: Coehorns
	clear_undo();
	log("Resolve siege in " + space_name(space));
	let att_leader = find_friendly_commanding_leader_in_space(space);
	let def_leader = find_enemy_commanding_leader_in_space(space);
	let die = roll_d6();
	let msg = `Roll ${die}`;
	let drm_att_ld = leader_tactics(att_leader);
	let drm = drm_att_ld;
	msg += `\n+${drm_att_ld} besieger's leader`;
	if (def_leader) {
		let drm_def_ld = leader_tactics(def_leader);
		drm += drm_def_ld;
		msg += `\n-${drm_def_ld} defender's leader`;
	}
	if (space === LOUISBOURG) {
		msg += `\n-1 for Louisbourg`;
		drm -= 1;
	}
	let result = SIEGE_TABLE[clamp(die + drm, 0, 7)];
	msg += `\n= ${result}`;
	log(msg);
	if (result > 0) {
		let level = change_siege_marker(space, result);
		log("Siege level is " + level);
	}
	goto_assault_possible(space);
}

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
	goto_battle(where, true, false);
}

// RAID

function goto_pick_raid() {
	clear_undo();
	if (game.raid.list.length > 0) {
		game.state = 'pick_raid';
	} else {
		delete game.raid;
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
			resolve_raid();
		} else {
			set_active(enemy());
			game.state = 'militia_against_raid';
			game.count = 1;
		}
	} else {
		resolve_raid();
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
			goto_battle(game.raid.where, false, false);
		else
			resolve_raid();
	},
}

const RAID_TABLE = {
	stockade:   [  2, 1, 1, 0, 2, 1, 0, 0 ],
	cultivated: [  2, 0, 0, 0, 1, 1, 0, 0 ],
};

function resolve_raid() {
	let where = game.raid.where;
	let x_stockade = has_enemy_stockade(where);
	let x_allied = has_enemy_allied_settlement(where);

	let column = 'cultivated';
	if (x_stockade || x_allied || (game.events.blockhouses === game.active))
		column = 'stockade';

	let d = roll_d6();
	let drm = 0;
	let mods = [];

	let commander = find_friendly_commanding_leader_in_space(where);
	if (commander) {
		console.log(`${piece_name(commander)} leads the raid`);
		let t = leader_tactics(commander);
		drm += t;
		mods.push(` +${t} tactics rating`);
	}

	if (has_friendly_rangers(where)) {
		drm += 1;
		mods.push(" +1 for rangers");
	}

	if (enemy_department_has_at_least_n_militia(where, 2)) {
		drm -= 1;
		mods.push(" -1 for militia in department");
	}

	log(`Raid ${space_name(where)} roll ${d}${mods.join(",")} = ${d+drm} on column vs. ${column}.`);
	let result = clamp(d + drm, 0, 7);
	let success = result >= 5;
	let losses = RAID_TABLE[column][result];

	if (success) {
		log(`Result: Success with ${losses} losses.`);
		if (x_stockade || x_allied || !has_friendly_raided_marker(where))
			place_friendly_raided_marker(where);
		if (x_stockade)
			eliminate_enemy_stockade_in_raid(where);
		if (x_allied)
			eliminate_indian_tribe(indian_tribe[where]);
	} else {
		log(`Result: Failure with ${losses} losses.`);
	}

	game.raid.step_loss = losses;

	// 10.32: leader check
	if (d === 1 || (d === 6 && column === 'vs_stockade'))
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
			isolate_piece_from_force(p);
			return p;
		}
	}
	return 0;
}

function raiders_go_home() {
	// RULE: raiders go home -- can go to separate locations if many available?
	// Leaders, coureurs and rangers go to nearest fortification
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

// EVENTS

const TODO = { can_play() { return false } };

events.campaign = TODO;

events.northern_indian_alliance = TODO;
events.western_indian_alliance = TODO;
events.iroquois_indian_alliance = TODO;
events.mohawks = TODO;
events.cherokees = TODO;
events.cherokee_uprising = TODO;
events.treaty_of_easton = TODO;

events.provincial_regiments_dispersed_for_frontier_duty = TODO;

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
		let roll = roll_d6()
		if (roll <= 3) {
			log("Roll " + roll + ".");
			log("No French naval moves ever.");
			log("British may play Quiberon.");
			log("Card removed.");
			game.events.no_fr_naval = 1;
			remove_card(LOUISBOURG_SQUADRONS);
		} else {
			log("Roll " + roll + ": no effect.");
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
			isolate_piece_from_force(p);
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
			isolate_piece_from_force(p);
			game.swap = p;
		}
	},
}

events.small_pox = {
	can_play() {
		console.log("can_play_small_pox");
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
		log(`Small Pox in ${space_name(s)}.`);
		let roll = roll_d6();
		log("Roll " + roll + ".");
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
		let roll = roll_d6();
		log("Roll " + roll + ".");
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
	discard(c) {
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
	// TODO: use provincial unit numbers
	for (let p = first_british_unit; p <= last_british_unit; ++p)
		if (is_provincial_unit_from(p, dept) && is_piece_on_map(p))
			if (is_piece_unbesieged(p))
				++n;
	return n;
}

function count_provincial_units_from(dept) {
	let n = 0;
	// TODO: use provincial unit numbers
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
			// TODO: use provincial unit numbers
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
			// TODO: use provincial unit numbers
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
		if (is_provincial_unit_from(p, dept) && is_unit_unused(p))
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
		log(`Restores all provincials of ${game.department} department.`);
		for (let p = first_friendly_unit; p <= last_friendly_unit; ++p) {
			if (is_provincial_unit_from(p, game.department) && is_piece_unbesieged(p) && is_unit_reduced(p)) {
				log(`Restores ${piece_name(p)}.`);
				set_unit_reduced(p, 0);
			}
		}
		game.count = 0;
	},
	space(s) {
		push_undo();
		let p = find_unused_provincial(game.department);
		log(`Raises ${piece_name(p)} in ${space_name(s)}.`);
		move_piece_to(p, s);
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
		if (game.year > 1759)
			return true;
		return false;
	},
	play() {
		log("Battle destroys French fleet.");
		game.events.quiberon = 1;
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
		let roll = roll_d6();
		log("Roll " + roll + ".");
		game.state = 'colonial_recruits';
		game.count = roll;
	},
}

states.colonial_recruits = {
	prompt() {
		let can_restore = false;
		if (game.count > 0) {
			for (let p = first_friendly_unit; p <= last_friendly_unit; ++p) {
				if (is_colonial_recruit(p) && is_piece_unbesieged(p) && is_unit_reduced(p)) {
					can_restore = true;
					gen_action_piece(p);
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
		log(`Restores ${piece_name(p)}.`);
		set_unit_reduced(p, 0);
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
		if (game.year <= 1755)
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
		let roll = roll_d5();
		log("Roll " + roll + ".");
		game.state = 'restore_regular_or_light_infantry_units';
		game.count = roll;
	},
}

states.restore_regular_or_light_infantry_units = {
	prompt() {
		let can_restore = false;
		if (game.count > 0) {
			for (let p = first_friendly_unit; p <= last_friendly_unit; ++p) {
				if (is_regulars_unit(p) || is_light_infantry_unit(p)) {
					if (is_piece_unbesieged(p) && is_unit_reduced(p)) {
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
		log(`Restores ${piece_name(p)}.`);
		set_unit_reduced(p, 0);
		game.count --;
	},
	next() {
		end_action_phase();
	},
}

function find_unused_friendly_militia() {
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
		if (is_militia_unit(p) && is_unit_unused(p))
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
		log(`Places militia in ${space_name(s)}.`);
		let p = find_unused_friendly_militia();
		move_piece_to(p, s);
		game.count -= 2;
	},
	piece(p) {
		push_undo();
		let s = piece_space(p);
		log(`Restores militia in ${space_name(s)}.`);
		set_unit_reduced(p, 0);
		game.count -= 1;
	},
	next() {
		end_action_phase();
	},
}

function find_unused_rangers() {
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
		if (is_rangers_unit(p) && is_unit_unused(p))
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
			if (find_unused_rangers()) {
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
				if (is_rangers_unit(p) && is_unit_reduced(p) && is_piece_on_map(p)) {
					if (is_piece_unbesieged(p)) {
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
		log(`Places rangers in ${space_name(s)}.`);
		let p = find_unused_rangers();
		move_piece_to(p, s);
		game.count -= 2;
	},
	piece(p) {
		push_undo();
		let s = piece_space(p);
		log(`Restores rangers in ${space_name(s)}.`);
		set_unit_reduced(p, 0);
		game.count -= 1;
	},
	next() {
		end_action_phase();
	},
}

function find_unused_light_infantry() {
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
		if (is_light_infantry_unit(p) && is_unit_unused(p))
			return p;
	return 0;
}

function place_two_light_infantry(s) {
	let p = find_unused_light_infantry();
	if (p)
		move_piece_to(p, s);
	p = find_unused_light_infantry();
	if (p)
		move_piece_to(p, s);
}

events.light_infantry = {
	play() {
		clear_undo(); // drawing leader from pool reveals information
		game.state = 'light_infantry';
		game.leader = draw_leader_from_pool();
		game.count = 1;
		if (game.leader) {
			move_piece_to(game.leader, leader_box(game.leader));
			place_two_light_infantry(leader_box(game.leader));
		}
	}
}

states.light_infantry = {
	prompt() {
		if (game.leader) {
			view.prompt = `Place 2 Light Infantry units and ${piece_name(game.leader)} at a fortress.`;
			view.who = game.leader;
		} else {
			view.prompt = `Place 2 Light Infantry units at a fortress.`;
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
			log(`Places 2 Light Infantry and ${piece_name(game.leader)} in ${space_name(s)}.`);
			move_piece_to(game.leader, s);
		} else {
			log(`Places 2 Light Infantry in ${space_name(s)}.`);
			place_two_light_infantry(s);
		}
		game.count = 0;
	},
	next() {
		delete game.leader;
		end_action_phase();
	},
}

events.french_regulars = TODO;
events.british_regulars = TODO;
events.highlanders = TODO;
events.royal_americans = TODO;

events.acadians_expelled = TODO;
events.william_pitt = TODO;
events.diplomatic_revolution = TODO;
events.intrigues_against_shirley = TODO;

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

	setup_leader("offmap", "Dieskau");
	setup_leader("offmap", "Beaujeu");

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

	setup_leader("offmap", "Braddock");
	setup_leader("offmap", "Shirley");

	game.events.pitt = 1;
	game.events.diplo = 1;

	game.France.hand_size = 9;
	game.Britain.hand_size = 9;

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

	setup_leader("offmap", "Amherst");
	setup_leader("offmap", "Forbes");
	setup_leader("offmap", "Wolfe");

	game.France.hand_size = 8;
	game.Britain.hand_size = 8;

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
			activated: [],
			pool: [],
		},
		sieges: {},
		France: {
			hand: [],
			hand_size: 0,
			held: 0,
			did_construct: 0,
			allied: [],
			stockades: [],
			forts_uc: [],
			forts: [],
			raids: [],
		},
		Britain: {
			hand: [],
			hand_size: 0,
			held: 0,
			did_construct: 0,
			allied: [],
			stockades: [],
			forts_uc: [],
			forts: [],
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
	gen_action('discard', card);
}

function load_game_state(state) {
	game = state;
	update_active_aliases();
}

exports.resign = function (state, current) {
	load_game_state(state);
	if (game.state !== 'game_over') {
		log("");
		log(current + " resigned.");
		game.active = current;
		game.state = 'game_over';
		game.victory = current + " resigned.";
		game.result = enemy(current);
		game.active = 'None';
	}
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

	if (game.move)
		view.move = game.move;
	if (game.force)
		view.force = game.force;

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
