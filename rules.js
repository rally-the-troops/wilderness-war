"use strict";

// WONTFIX
// TODO: select leader for defense instead of automatically picking the best
// TODO: remove old 7 command leader(s) immediately as they're drawn, before placing reinforcements

const { spaces, pieces, cards } = require("./data");

const BRITAIN = 'Britain';
const FRANCE = 'France';

// CARDS
const first_amphib_card = 17;
const last_amphib_card = 20;
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
const LOUISBOURG_SQUADRONS = 21;
const WILLIAM_PITT = 67;
const DIPLOMATIC_REVOLUTION = 69;

// PIECE RANGES
const first_piece = 1;
const last_piece = 151;
const first_british_piece = 1;
const last_british_piece = 86;
const first_british_leader = 1;
const last_british_leader = 13;
const first_british_unit = 14;
const last_british_unit = 86;
const first_french_piece = 87;
const last_french_piece = 151;
const first_french_leader = 87;
const last_french_leader = 96;
const first_french_unit = 97;
const last_french_unit = 151;
const first_british_militia = 83;
const last_british_militia = 86;
const first_french_militia = 148;
const last_french_militia = 151;
const first_french_regular = 134;
const last_french_regular = 147;
const first_coureurs = 119;
const last_coureurs = 126;
const first_british_regular = 56;
const last_british_regular = 72;
const first_highland = 77;
const last_highland = 82;
const first_royal_american = 73;
const last_royal_american = 76;
const first_light_infantry = 26;
const last_light_infantry = 31;
const first_southern_provincial = 50;
const last_southern_provincial = 55;
const first_northern_provincial = 32;
const last_northern_provincial = 49;
const first_ranger = 23;
const last_ranger = 25;
const first_cherokee = 14;
const last_cherokee = 15;
const first_mohawk = 21;
const last_mohawk = 22;
const first_orange_indian = 113;
const last_orange_indian = 118;
function is_leader(p) { return (p >= 1 && p <= 13) || (p >= 87 && p <= 96); }
function is_unit(p) { return (p >= 14 && p <= 86) || (p >= 97 && p <= 151); }
function is_auxiliary(p) { return (p >= 14 && p <= 25) || (p >= 97 && p <= 126); }
function is_drilled_troops(p) { return (p >= 26 && p <= 82) || (p >= 127 && p <= 147); }
function is_militia(p) { return (p >= 83 && p <= 86) || (p >= 148 && p <= 151); }
function is_regular(p) { return (p >= 56 && p <= 82) || (p >= 127 && p <= 147); }
function is_light_infantry(p) { return (p >= 26 && p <= 31); }
function is_provincial(p) { return (p >= 32 && p <= 55); }
function is_southern_provincial(p) { return (p >= 50 && p <= 55); }
function is_northern_provincial(p) { return (p >= 32 && p <= 49); }
function is_coureurs(p) { return (p >= 119 && p <= 126); }
function is_ranger(p) { return (p >= 23 && p <= 25); }
function is_indian(p) { return (p >= 14 && p <= 22) || (p >= 97 && p <= 118); }
function is_french_indian(p) { return (p >= 97 && p <= 118); }
function is_british_indian(p) { return (p >= 14 && p <= 22); }
function is_blue_indian(p) { return (p >= 101 && p <= 107); }
function is_orange_indian(p) { return (p >= 113 && p <= 118); }
function is_blue_orange_indian(p) { return (p >= 97 && p <= 100); }
function is_gray_indian(p) { return (p >= 16 && p <= 20) || (p >= 108 && p <= 112); }
function is_cherokee(p) { return (p >= 14 && p <= 15); }
function is_mohawk(p) { return (p >= 21 && p <= 22); }
function is_british_iroquois_or_mohawk(p) { return (p >= 16 && p <= 22); }
const AMHERST = 1;
const BRADDOCK = 2;
const ABERCROMBY = 3;
const LOUDOUN = 4;
const WOLFE = 5;
const FORBES = 6;
const SHIRLEY = 7;
const MURRAY = 8;
const MONCKTON = 9;
const WEBB = 10;
const BRADSTREET = 11;
const DUNBAR = 12;
const JOHNSON = 13;
const MONTCALM = 87;
const DIESKAU = 88;
const LEVIS = 89;
const VAUDREUIL = 90;
const DRUCOUR = 91;
const RIGAUD = 92;
const VILLIERS = 93;
const BOUGAINVILLE = 94;
const BEAUJEU = 95;
const DUMAS = 96;

// SPACE RANGES
const first_space = 1;
const last_space = 141;
const first_leader_box = 145;
const last_leader_box = 167;
const first_northern_department = 1;
const last_northern_department = 21;
const first_southern_department = 22;
const last_southern_department = 40;
const first_st_lawrence_department = 41;
const last_st_lawrence_department = 52;
function is_leader_box(s) { return (s >= 145 && s <= 167); }
function is_fortress(s) { return (s >= 1 && s <= 4) || (s >= 22 && s <= 24) || (s >= 41 && s <= 42) || (s >= 139 && s <= 140); }
function is_port(s) { return (s >= 1 && s <= 3) || (s >= 22 && s <= 24) || (s === 41) || (s >= 139 && s <= 140); }
function is_st_lawrence_department(s) { return (s >= 41 && s <= 52); }
function is_southern_department(s) { return (s >= 22 && s <= 40); }
function is_northern_department(s) { return (s >= 1 && s <= 21); }
function is_originally_french(s) { return (s >= 41 && s <= 52) || (s === 140); }
function is_originally_british(s) { return (s >= 1 && s <= 40) || (s === 139); }
function is_wilderness_or_mountain(s) { return (s >= 53 && s <= 138); }
function is_wilderness(s) { return (s >= 53 && s <= 119); }
function is_mountain(s) { return (s >= 120 && s <= 138); }
function is_cultivated(s) { return (s >= 1 && s <= 52); }
const ALBANY = 4;
const ALEXANDRIA = 22;
const BAIE_ST_PAUL = 43;
const BALTIMORE = 23;
const BOSTON = 1;
const CANAJOHARIE = 56;
const CAYUGA = 60;
const HALIFAX = 139;
const KAHNAWAKE = 45;
const KARAGHIYADIRHA = 76;
const KITTANING = 77;
const LAC_DES_DEUX_MONTAGNES = 46;
const LOGSTOWN = 81;
const LOUISBOURG = 140;
const MINGO_TOWN = 83;
const MISSISSAUGA = 84;
const MONTREAL = 42;
const NEW_HAVEN = 2;
const NEW_YORK = 3;
const NIAGARA = 86;
const OHIO_FORKS = 88;
const ONEIDA_CARRY_EAST = 89;
const ONEIDA_CARRY_WEST = 90;
const ONEIDA_CASTLE = 91;
const ONONDAGA = 92;
const OSWEGO = 96;
const PAYS_D_EN_HAUT = 141;
const PHILADELPHIA = 24;
const QUEBEC = 41;
const RIVIERE_OUELLE = 47;
const SHAWIANGTO = 102;
const ST_FRANCOIS = 49;
const ILE_D_ORLEANS = 52;
const NORTHERN_COLONIAL_MILITIAS = 142;
const SOUTHERN_COLONIAL_MILITIAS = 143;
const ST_LAWRENCE_CANADIAN_MILITIAS = 144;

// Patch up leader/box associations.
const box_from_leader = [];
const leader_from_box = [];
for (let p = 0; p <= last_piece; ++p)
	box_from_leader[p] = 0;
for (let s = first_leader_box; s <= last_leader_box; ++s) {
	let p = pieces.findIndex(piece => piece.name === spaces[s].name);
	box_from_leader[p] = s;
	leader_from_box[s-first_leader_box] = p;
}

// Patch up space exits.
for (let s = first_space; s <= last_space; ++s) {
	let ss = spaces[s];
	ss.exits = ss.land.concat(ss.river).concat(ss.lakeshore);
	ss.exits_with_type = [];
	ss.land.forEach(n => ss.exits_with_type.push([n,'land']));
	ss.river.forEach(n => ss.exits_with_type.push([n,'river']));
	ss.lakeshore.forEach(n => ss.exits_with_type.push([n,'lakeshore']));
}

// Make non-breaking names.
spaces.forEach(ss => ss.nb_name = ss.name.replace(/ /g, '\xa0'));
pieces.forEach(pp => {
	if (pp.desc) pp.nb_desc = pp.desc.replace(/ /g, '\xa0');
	if (pp.rdesc) pp.nb_rdesc = pp.rdesc.replace(/ /g, '\xa0');
});

let game;
let view = null;
let states = {};
let events = {};

let player; // aliased to game.french/british per-player state
let enemy_player; // aliased to game.french/british per-player state
let supply_cache; // cleared when setting active player and loading game state

// These looping indices are updated with update_active_aliases()
let first_enemy_leader;
let first_enemy_piece;
let first_enemy_unit;
let last_enemy_leader;
let last_enemy_piece;
let last_enemy_unit;
let first_friendly_leader;
let first_friendly_piece;
let first_friendly_unit;
let last_friendly_leader;
let last_friendly_piece;
let last_friendly_unit;

function abs(x) {
	return x < 0 ? -x : x;
}

function random(n) {
	return ((game.seed = game.seed * 69621 % 0x7fffffff) / 0x7fffffff) * n | 0;
}

function roll_die(reason) {
	let die = random(6) + 1;
	if (reason)
		log(`Rolled ${die} ${reason}.`);
	else
		log(`Rolled ${die}.`);
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

function logbr() {
	if (game.log.length > 0 && game.log[game.log.length-1] !== "")
		game.log.push("");
}

function log(msg) {
	game.log.push(msg);
}

function push_summary(summary, p) {
	let s = piece_space(p);
	if (!(s in summary))
		summary[s] = [];
	summary[s].push(piece_name(p));
}

function print_summary(summary, verb) {
	for (let s in summary)
		log(verb + space_name(Number(s)) + "\n" + summary[s].join(",\n") + ".");
}

function flush_summary() {
	if (game.summary) {
		print_summary(game.summary.placed, "Placed at ");
		print_summary(game.summary.restored, "Restored at ");
		print_summary(game.summary.reduced, "Reduced at ");
		print_summary(game.summary.eliminated, "Eliminated at ");
		game.summary.placed = {};
		game.summary.restored = {};
		game.summary.reduced = {};
		game.summary.eliminated = {};
	}
}

function init_retreat_summary() {
	if (game.summary)
		game.summary.retreat = {};
}

function push_retreat_summary(p, s) {
	if (game.summary) {
		if (!(s in game.summary.retreat))
			game.summary.retreat[s] = [];
		game.summary.retreat[s].push(p);
	} else {
		// log(piece_name(p) + " retreated " + s + ".");
		log(piece_name(p) + " " + s + ".");
	}
}

function flush_retreat_summary() {
	if (game.summary) {
		for (let s in game.summary.retreat)
			log("Retreated " + s + "\n" + game.summary.retreat[s].map(piece_name).join(",\n") + ".");
		delete game.summary.retreat;
	}
}

function init_go_home_summary() {
	if (game.summary)
		game.summary.go_home = {};
}

function push_go_home_summary(p, s) {
	if (game.summary) {
		if (!(s in game.summary.go_home))
			game.summary.go_home[s] = [];
		game.summary.go_home[s].push(piece_name_and_place(p));
	} else {
		// log(piece_name_and_place(p) + " went home to " + space_name(s) + ".");
		log(piece_name_and_place(p) + " home to " + space_name(s) + ".");
	}
}

function flush_go_home_summary() {
	if (game.summary) {
		print_summary(game.summary.go_home, "Went home to ");
		delete game.summary.go_home;
	}
}

function enemy() {
	return game.active === FRANCE ? BRITAIN : FRANCE;
}

function set_active_enemy() {
	game.active = (game.active === FRANCE) ? BRITAIN : FRANCE;
	update_active_aliases();
}

function set_active(new_active) {
	game.active = new_active;
	update_active_aliases();
}

function update_active_aliases() {
	supply_cache = null;
	if (game.active === BRITAIN) {
		player = game.british;
		enemy_player = game.french;

		first_friendly_piece = first_british_piece;
		last_friendly_piece = last_british_piece;
		first_friendly_leader = first_british_leader;
		last_friendly_leader = last_british_leader;
		first_friendly_unit = first_british_unit;
		last_friendly_unit = last_british_unit;

		first_enemy_piece = first_french_piece;
		last_enemy_piece = last_french_piece;
		first_enemy_leader = first_french_leader;
		last_enemy_leader = last_french_leader;
		first_enemy_unit = first_french_unit;
		last_enemy_unit = last_french_unit;

	} else {
		player = game.french;
		enemy_player = game.british;

		first_friendly_piece = first_french_piece;
		last_friendly_piece = last_french_piece;
		first_friendly_leader = first_french_leader;
		last_friendly_leader = last_french_leader;
		first_friendly_unit = first_french_unit;
		last_friendly_unit = last_french_unit;

		first_enemy_piece = first_british_piece;
		last_enemy_piece = last_british_piece;
		first_enemy_leader = first_british_leader;
		last_enemy_leader = last_british_leader;
		first_enemy_unit = first_british_unit;
		last_enemy_unit = last_british_unit;
	}
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

function find_unused_piece(name) {
	for (let i = 0; i <= last_piece; ++i)
		if (pieces[i].name === name && game.location[i] === 0)
			return i;
	throw new Error("cannot find unit " + name);
}

function find_unused_provincial(dept) {
	if (dept === 'northern') {
		for (let p = first_northern_provincial; p <= last_northern_provincial; ++p)
			if (is_piece_unused(p))
				return p;
	} else {
		for (let p = first_southern_provincial; p <= last_southern_provincial; ++p)
			if (is_piece_unused(p))
				return p;
	}
	return 0;
}

function find_unused_friendly_militia() {
	if (game.active === FRANCE) {
		for (let p = first_french_militia; p <= last_french_militia; ++p)
			if (is_piece_unused(p))
				return p;
	} else {
		for (let p = first_british_militia; p <= last_british_militia; ++p)
			if (is_piece_unused(p))
				return p;
	}
	return 0;
}

function find_unused_coureurs() {
	for (let p = first_coureurs; p <= last_coureurs; ++p)
		if (is_piece_unused(p))
			return p;
	return 0;
}

function find_unused_ranger() {
	for (let p = first_ranger; p <= last_ranger; ++p)
		if (is_piece_unused(p))
			return p;
	return 0;
}

function find_unused_british_regular() {
	for (let p = first_british_regular; p <= last_british_regular; ++p)
		if (is_piece_unused(p))
			return p;
	return 0;
}

function find_unused_french_regular() {
	for (let p = first_french_regular; p <= last_french_regular; ++p)
		if (is_piece_unused(p))
			return p;
	return 0;
}

function find_unused_highland() {
	for (let p = first_highland; p <= last_highland; ++p)
		if (is_piece_unused(p))
			return p;
	return 0;
}

function find_unused_royal_american() {
	for (let p = first_royal_american; p <= last_royal_american; ++p)
		if (is_piece_unused(p))
			return p;
	return 0;
}

function find_unused_light_infantry() {
	for (let p = first_light_infantry; p <= last_light_infantry; ++p)
		if (is_piece_unused(p))
			return p;
	return 0;
}

const ports = [
	ALEXANDRIA,
	BALTIMORE,
	BOSTON,
	HALIFAX,
	LOUISBOURG,
	NEW_HAVEN,
	NEW_YORK,
	PHILADELPHIA,
	QUEBEC,
]

const fortresses = [
	ALBANY,
	ALEXANDRIA,
	BALTIMORE,
	BOSTON,
	HALIFAX,
	LOUISBOURG,
	MONTREAL,
	NEW_HAVEN,
	NEW_YORK,
	PHILADELPHIA,
	QUEBEC,
]

const originally_french_fortresses = [
	LOUISBOURG,
	MONTREAL,
	QUEBEC,
];

const originally_british_fortresses = [
	ALBANY,
	ALEXANDRIA,
	BALTIMORE,
	BOSTON,
	HALIFAX,
	NEW_HAVEN,
	NEW_YORK,
	PHILADELPHIA,
];

const originally_british_fortresses_and_all_ports = [
	ALBANY,
	ALEXANDRIA,
	BALTIMORE,
	BOSTON,
	HALIFAX,
	LOUISBOURG,
	NEW_HAVEN,
	NEW_YORK,
	PHILADELPHIA,
	QUEBEC,
];

function is_friendly_indian(p) {
	if (game.active === FRANCE)
		return is_french_indian(p);
	return is_british_indian(p);
}

const indians = {
	spaces_from_color: {},
	pieces_from_color: {},
	pieces_from_space: {},
	space_from_piece: {},
	tribe_from_space: {},
};

function define_indian(color, space, tribe) {
	if (!indians.pieces_from_color[color])
		indians.pieces_from_color[color] = [];
	if (!indians.spaces_from_color[color])
		indians.spaces_from_color[color] = [];
	if (space) {
		if (!indians.spaces_from_color[color].includes(space))
			indians.spaces_from_color[color].push(space);
	}
	if (!indians.pieces_from_space[space])
		indians.pieces_from_space[space] = [];
	if (space === PAYS_D_EN_HAUT)
		indians.tribe_from_space[space] = "Pays d'en Haut";
	else
		indians.tribe_from_space[space] = tribe;
	for (let p = 1; p <= last_piece; ++p) {
		if (is_indian(p) && pieces[p].name === tribe) {
			indians.pieces_from_color[color].push(p);
			indians.pieces_from_space[space].push(p);
			indians.space_from_piece[p] = space;
		}
	}
}

define_indian("cherokee", 0, "Cherokee");
define_indian("mohawk", CANAJOHARIE, "Mohawk");

define_indian("blue", ST_FRANCOIS, "Abenaki");
define_indian("blue", LAC_DES_DEUX_MONTAGNES, "Algonquin");
define_indian("blue", KAHNAWAKE, "Caughnawaga");
define_indian("blue", MISSISSAUGA, "Mississauga");

define_indian("orange", KITTANING, "Delaware");
define_indian("orange", MINGO_TOWN, "Mingo");
define_indian("orange", LOGSTOWN, "Shawnee");

define_indian("blue-orange", PAYS_D_EN_HAUT, "Huron");
define_indian("blue-orange", PAYS_D_EN_HAUT, "Ojibwa");
define_indian("blue-orange", PAYS_D_EN_HAUT, "Ottawa");
define_indian("blue-orange", PAYS_D_EN_HAUT, "Potawatomi");

define_indian("gray", CAYUGA, "Cayuga");
define_indian("gray", ONEIDA_CASTLE, "Oneida");
define_indian("gray", ONONDAGA, "Onondaga");
define_indian("gray", KARAGHIYADIRHA, "Seneca");
define_indian("gray", SHAWIANGTO, "Tuscarora");

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
indians.spaces_from_color.gray.forEach(zero => {
	within_two_of_gray_settlement.push(zero);
});
indians.spaces_from_color.gray.forEach(zero => {
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

// CARD DECK

function reshuffle_deck() {
	game.last_card = 0;
	game.log.push("Deck reshuffled.");
	game.deck = game.deck.concat(game.discard);
	game.discard = [];
}

function deal_card() {
	if (game.deck.length === 0)
		reshuffle_deck();
	let i = random(game.deck.length);
	let c = game.deck[i];
	game.deck.splice(i, 1);
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

	if (game.discard.includes(SURRENDER)) {
		reshuffle_deck();
	}

	if (game.options.pitt_dip_rev) {
		if (game.events.pitt && !game.events.diplo && game.discard.includes(DIPLOMATIC_REVOLUTION)) {
			log(`France received Diplomatic Revolution from discard.`);
			remove_from_array(game.discard, DIPLOMATIC_REVOLUTION);
			game.french.hand.push(DIPLOMATIC_REVOLUTION);
		}
		if (!game.events.pitt && game.events.diplo && game.discard.includes(WILLIAM_PITT)) {
			log(`Britain received William Pitt from discard.`);
			remove_from_array(game.discard, WILLIAM_PITT);
			game.british.hand.push(WILLIAM_PITT);
		}
	}

	fn = fn - game.french.hand.length;
	bn = bn - game.british.hand.length;

	log("Dealt " + fn + " cards to France.");
	log("Dealt " + bn + " cards to Britain.");

	while (fn > 0 || bn > 0) {
		if (fn > 0) {
			game.french.hand.push(deal_card());
			--fn;
		}
		if (bn > 0) {
			game.british.hand.push(deal_card());
			--bn;
		}
	}
}

function draw_leader_from_pool() {
	if (game.british.pool.length > 0) {
		let i = random(game.british.pool.length);
		let p = game.british.pool[i];

		// 5.55 If both on-map 7 leaders are besieged, return the third to the pool without substitution.
		if (is_seven_command_leader(p)) {
			let n = 0;
			if (is_piece_on_map(ABERCROMBY) && is_piece_inside(ABERCROMBY)) ++n;
			if (is_piece_on_map(AMHERST) && is_piece_inside(AMHERST)) ++n;
			if (is_piece_on_map(BRADDOCK) && is_piece_inside(BRADDOCK)) ++n;
			if (is_piece_on_map(LOUDOUN) && is_piece_inside(LOUDOUN)) ++n;
			if (n >= 2) {
				log(`Returned ${piece_name(p)} to pool.`);
				return 0;
			}
		}

		game.british.pool.splice(i, 1);
		game.location[p] = box_from_leader[p];
		return p;
	}
	return 0;
}

function is_card_available(c) {
	return !game.discard.includes(c) && !game.removed.includes(c);
}

function is_enemy_card_available(c) {
	return enemy_player.hand.length > 0 && is_card_available(c);
}

function is_friendly_card_available(c) {
	return player.hand.length > 0 && is_card_available(c);
}

function get_player_hand(role) {
	if (role === FRANCE)
		return game.french.hand;
	return game.british.hand;
}

function is_card_available_for_attacker(c) {
	return get_player_hand(game.battle.attacker).length > 0 && is_card_available(c);
}

function is_card_available_for_defender(c) {
	return get_player_hand(game.battle.defender).length > 0 && is_card_available(c);
}

// ITERATORS

function for_each_siege(fn) {
	for (let sid in game.sieges)
		fn(sid|0, game.sieges[sid]);
}

function for_each_exit_with_type(s, fn) {
	for (let [n, t] of spaces[s].exits_with_type)
		fn(n, t);
}

function for_each_exit(s, fn) {
	for (let n of spaces[s].exits)
		fn(n);
}

function for_each_friendly_piece_in_node(node, fn) {
	for (let p = first_friendly_piece; p <= last_friendly_piece; ++p) {
		if (is_piece_in_node(p, node))
			fn(p);
	}
}

function for_each_unbesieged_friendly_piece_in_space(s, fn) {
	for (let p = first_friendly_piece; p <= last_friendly_piece; ++p) {
		if (is_piece_unbesieged_in_space(p, s))
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

function for_each_friendly_piece_in_space(s, fn) {
	for (let p = first_friendly_piece; p <= last_friendly_piece; ++p) {
		if (is_piece_in_space(p, s))
			fn(p);
	}
}

function for_each_friendly_leader_in_space(s, fn) {
	for (let p = first_friendly_leader; p <= last_friendly_leader; ++p) {
		if (is_piece_in_space(p, s))
			fn(p);
	}
}

function for_each_friendly_unit_in_space(s, fn) {
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p) {
		if (is_piece_in_space(p, s))
			fn(p);
	}
}

function for_each_unbesieged_enemy_in_space(s, fn) {
	for (let p = first_enemy_unit; p <= last_enemy_unit; ++p) {
		if (is_piece_unbesieged_in_space(p, s))
			fn(p);
	}
}

function for_each_piece_in_force(force, fn) {
	for (let p = 1; p <= last_piece; ++p)
		if (is_piece_in_force(p, force))
			fn(p);
}

function for_each_leader_in_force(force, fn) {
	for (let p = 1; p <= last_piece; ++p)
		if (is_leader(p) && is_piece_in_force(p, force))
			fn(p);
}

function for_each_unit_in_force(force, fn) {
	for (let p = 1; p <= last_piece; ++p)
		if (!is_leader(p) && is_piece_in_force(p, force))
			fn(p);
}

function for_each_british_controlled_port(fn) {
	for (let i = 0; i < ports.length; ++i)
		if (is_british_controlled_space(ports[i]))
			fn(ports[i]);
}

function for_each_british_controlled_port_and_amphib(fn) {
	for (let i = 0; i < ports.length; ++i)
		if (is_british_controlled_space(ports[i]))
			fn(ports[i]);
	game.amphib.forEach(fn);
}

function list_auxiliary_units_in_force(force) {
	let list = [];
	for_each_unit_in_force(force, p => {
		if (is_auxiliary(p))
			list.push(p);
	});
	return list;
}

// STATIC PROPERTIES

function department_militia(s) {
	if (is_st_lawrence_department(s))
		return ST_LAWRENCE_CANADIAN_MILITIAS;
	if (is_northern_department(s))
		return NORTHERN_COLONIAL_MILITIAS;
	if (is_southern_department(s))
		return SOUTHERN_COLONIAL_MILITIAS;
	return 0;
}

function space_name(s) {
	return spaces[s].nb_name;
}

function is_lake_connection(from, to) {
	let exits = spaces[from].lakeshore;
	for (let i = 0; i < exits.length; ++i)
		if (exits[i] === to)
			return true;
	return false;
}

function has_amphibious_arrow(s) {
	return s === HALIFAX || s === LOUISBOURG;
}

function is_originally_friendly(s) {
	if (game.active === FRANCE)
		return is_originally_french(s);
	return is_originally_british(s);
}

function is_originally_enemy(s) {
	if (game.active === BRITAIN)
		return is_originally_french(s);
	return is_originally_british(s);
}

function piece_name(p) {
	if (is_unit_reduced(p))
		return pieces[p].nb_rdesc;
	return pieces[p].nb_desc;
}

function piece_name_and_place(p) {
	// return piece_name(p) + " at " + space_name(piece_space(p));
	return piece_name(p) + " (" + space_name(piece_space(p)) + ")";
}

function piece_movement(p) {
	return pieces[p].movement;
}

function leader_box(p) {
	return box_from_leader[p];
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
	return abs(game.location[p]);
}

function piece_space(p) {
	let where = abs(game.location[p]);
	if (is_leader_box(where))
		return abs(game.location[leader_from_box[where-first_leader_box]]);
	return where;
}

// is piece commanded by a leader (or self)
function is_piece_in_force(p, force) {
	if (p === force)
		return true;
	if (is_leader(force))
		return piece_node(p) === leader_box(force);
	return false;
}

function count_non_british_iroquois_and_mohawk_units_in_force(leader) {
	let n = 0;
	for_each_friendly_unit_in_node(leader_box(leader), p => {
		if (!is_british_iroquois_or_mohawk(p))
			++n;
	});
	return n;
}

function count_pieces_in_force(force) {
	let n = 0;
	for_each_piece_in_force(force, () => {
		++n;
	});
	return n;
}

function count_units_in_force(force) {
	let n = 0;
	for_each_unit_in_force(force, () => {
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
	for_each_friendly_unit_in_space(where, () => {
		++n;
	});
	return n;
}

function count_unbesieged_enemy_units_in_space(where) {
	let n = 0;
	for_each_unbesieged_enemy_in_space(where, () => {
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
	return game.reduced.includes(p);
}

function set_unit_reduced(p, v) {
	if (v) {
		if (!game.reduced.includes(p))
			game.reduced.push(p);
	} else {
		remove_from_array(game.reduced, p);
	}
}

function is_piece_inside(p) {
	return game.location[p] < 0;
}

function is_piece_unbesieged(p) {
	return game.location[p] > 0;
}

function set_piece_inside(p) {
	if (game.location[p] > 0)
		game.location[p] = -game.location[p];
}

function set_piece_outside(p) {
	if (game.location[p] < 0)
		game.location[p] = -game.location[p];
}

function is_piece_on_map(p) {
	return game.location[p] !== 0;
}

function is_piece_unused(p) {
	return game.location[p] === 0;
}

function is_piece_in_node(p, node) {
	return piece_node(p) === node;
}

function is_piece_in_space(p, s) {
	return piece_space(p) === s;
}

function is_piece_unbesieged_in_space(p, s) {
	return game.location[p] === s;
}

function is_piece_besieged_in_space(p, s) {
	return game.location[p] === -s;
}

function has_amphib(s) {
	return game.amphib.includes(s);
}

function has_friendly_amphib(s) {
	return game.active === BRITAIN && game.amphib.includes(s);
}

function has_enemy_amphib(s) {
	return game.active === FRANCE && game.amphib.includes(s);
}

function has_fieldworks(s) {
	return game.fieldworks.includes(s);
}

function place_fieldworks(s) {
	log(`Placed fieldworks at ${space_name(s)}.`);
	game.fieldworks.push(s);
}

function remove_fieldworks(s) {
	if (game.fieldworks.includes(s)) {
		// log(`Fieldworks (${space_name(s)}) removed.`);
		log(`Removed fieldworks at ${space_name(s)}.`);
		remove_from_array(game.fieldworks, s);
	}
}

function place_friendly_raided_marker(s) {
	log(`Placed raided marker at ${space_name(s)}.`);
	player.raids.push(s);
}

function has_friendly_raided_marker(s) {
	return player.raids.includes(s);
}

function has_enemy_raided_marker(s) {
	return enemy_player.raids.includes(s);
}

function is_space_besieged(s) {
	return s in game.sieges;
}

function is_space_unbesieged(s) {
	return !is_space_besieged(s);
}

function has_enemy_allied_settlement(s) {
	return enemy_player.allied.includes(s);
}

function has_friendly_allied_settlement(s) {
	return player.allied.includes(s);
}

function has_enemy_stockade(s) {
	return enemy_player.stockades.includes(s);
}

function has_friendly_stockade(s) {
	return player.stockades.includes(s);
}

function has_enemy_fortress(s) {
	return enemy_player.fortresses.includes(s);
}

function has_friendly_fortress(s) {
	return player.fortresses.includes(s);
}

function has_enemy_fort(s) {
	return enemy_player.forts.includes(s);
}

function has_friendly_fort(s) {
	return player.forts.includes(s);
}

function has_enemy_fort_uc(s) {
	return enemy_player.forts_uc.includes(s);
}

function has_friendly_fort_uc(s) {
	return player.forts_uc.includes(s);
}

function has_enemy_fort_or_fortress(s) {
	return has_enemy_fort(s) || has_enemy_fortress(s);
}

function has_enemy_fortifications(s) {
	return has_enemy_stockade(s) || has_enemy_fort(s) || has_enemy_fortress(s);
}

function has_friendly_fort_or_fortress(s) {
	return has_friendly_fort(s) || has_friendly_fortress(s);
}

function has_friendly_fortifications(s) {
	return has_friendly_stockade(s) || has_friendly_fort(s) || has_friendly_fortress(s);
}

function has_unbesieged_friendly_fortifications(s) {
	return is_space_unbesieged(s) && has_friendly_fortifications(s);
}

function has_unbesieged_friendly_fortress(s) {
	return is_space_unbesieged(s) && has_friendly_fortress(s);
}

function has_friendly_pieces(s) {
	for (let p = first_friendly_piece; p <= last_friendly_piece; ++p)
		if (is_piece_in_space(p, s))
			return true;
	return false;
}

function has_friendly_units(s) {
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
		if (is_piece_in_space(p, s))
			return true;
	return false;
}

function has_enemy_units(s) {
	for (let p = first_enemy_unit; p <= last_enemy_unit; ++p)
		if (is_piece_in_space(p, s))
			return true;
	return false;
}

function has_french_units(s) {
	for (let p = first_french_unit; p <= last_french_unit; ++p)
		if (is_piece_in_space(p, s))
			return true;
	return false;
}

function has_british_units(s) {
	for (let p = first_british_unit; p <= last_british_unit; ++p)
		if (is_piece_in_space(p, s))
			return true;
	return false;
}

function has_french_drilled_troops(s) {
	for (let p = first_french_unit; p <= last_french_unit; ++p)
		if (is_piece_in_space(p, s))
			if (is_drilled_troops(p))
				return true;
	return false;
}

function has_british_drilled_troops(s) {
	for (let p = first_british_unit; p <= last_british_unit; ++p)
		if (is_piece_in_space(p, s))
			if (is_drilled_troops(p))
				return true;
	return false;
}

function is_french_controlled_space(s) {
	if (game.active === FRANCE)
		return is_friendly_controlled_space(s);
	return is_enemy_controlled_space(s);
}

function has_french_stockade(s) {
	return game.french.stockades.includes(s);
}

function has_british_stockade(s) {
	return game.british.stockades.includes(s);
}

function has_french_fort(s) {
	return game.french.forts.includes(s);
}

function has_british_fort(s) {
	return game.british.forts.includes(s);
}

function is_french_fortress(s) {
	return originally_french_fortresses.includes(s);
}

function is_british_fortress(s) {
	return originally_british_fortresses.includes(s);
}

function has_french_fortifications(s) {
	return has_french_stockade(s) || has_french_fort(s) || is_french_fortress(s);
}

function has_british_fortifications(s) {
	return has_british_stockade(s) || has_british_fort(s) || is_british_fortress(s);
}

function has_unbesieged_french_fortification(s) {
	return is_space_unbesieged(s) && has_french_fortifications(s);
}

function count_enemy_units_in_space(s) {
	let n = 0;
	for (let p = first_enemy_unit; p <= last_enemy_unit; ++p)
		if (is_piece_in_space(p, s))
			++n;
	return n;
}

function has_unbesieged_friendly_leader(s) {
	for (let p = first_friendly_leader; p <= last_friendly_leader; ++p)
		if (is_piece_unbesieged_in_space(p, s))
			return true;
	return false;
}

function has_unbesieged_enemy_leader(s) {
	for (let p = first_enemy_leader; p <= last_enemy_leader; ++p)
		if (is_piece_unbesieged_in_space(p, s))
			return true;
	return false;
}

function has_unbesieged_enemy_units(s) {
	for (let p = first_enemy_unit; p <= last_enemy_unit; ++p)
		if (is_piece_unbesieged_in_space(p, s))
			return true;
	return false;
}

function has_unbesieged_enemy_pieces(s) {
	for (let p = first_enemy_piece; p <= last_enemy_piece; ++p)
		if (is_piece_unbesieged_in_space(p, s))
			return true;
	return false;
}

function has_unbesieged_enemy_units_that_did_not_intercept(s) {
	for (let p = first_enemy_unit; p <= last_enemy_unit; ++p)
		if (is_piece_unbesieged_in_space(p, s) && !did_piece_intercept(p))
			return true;
	return false;
}

function is_friendly_controlled_space(s) {
	if (is_space_unbesieged(s) && !has_enemy_units(s)) {
		if (is_originally_enemy(s)) {
			if (has_friendly_units(s) || has_friendly_stockade(s) || has_friendly_fort(s))
				return true;
			if (has_friendly_amphib(s))
				return true;
		} else if (is_originally_friendly(s)) {
			return !has_enemy_amphib(s);
		} else {
			if (has_friendly_units(s) || has_friendly_stockade(s) || has_friendly_fort(s))
				return true;
		}
	}
	return false;
}

function is_enemy_controlled_space(s) {
	if (is_space_unbesieged(s) && !has_friendly_units(s)) {
		if (is_originally_friendly(s)) {
			if (has_enemy_units(s) || has_enemy_stockade(s) || has_enemy_fort(s))
				return true;
			if (has_enemy_amphib(s))
				return true;
		} else if (is_originally_enemy(s)) {
			return !has_friendly_amphib(s);
		} else {
			if (has_enemy_units(s) || has_enemy_stockade(s) || has_enemy_fort(s))
				return true;
		}
	}
	return false;
}

function is_british_controlled_space(s) {
	if (game.active === BRITAIN)
		return is_friendly_controlled_space(s);
	return is_enemy_controlled_space(s);
}

function has_friendly_supplied_drilled_troops(s) {
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
		if (is_drilled_troops(p) && is_piece_in_space(p, s) && is_in_supply(s))
			return true;
	return false;
}

function has_friendly_drilled_troops(s) {
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
		if (is_drilled_troops(p) && is_piece_in_space(p, s))
			return true;
	return false;
}

function has_friendly_regulars(s) {
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
		if (is_regular(p) && is_piece_in_space(p, s))
			return true;
	return false;
}

function has_friendly_rangers(s) {
	if (game.active === BRITAIN)
		for (let p = first_british_unit; p <= last_british_unit; ++p)
			if (is_ranger(p) && is_piece_in_space(p, s))
				return true;
	return false;
}

function has_friendly_indians(s) {
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
		if (is_indian(p) && is_piece_in_space(p, s))
			return true;
	return false;
}

function has_unbesieged_enemy_auxiliary(s) {
	for (let p = first_enemy_unit; p <= last_enemy_unit; ++p)
		if (is_auxiliary(p) && is_piece_unbesieged_in_space(p, s))
			return true;
	return false;
}

function has_unbesieged_enemy_fortifications(s) {
	return is_space_unbesieged(s) && has_enemy_fortifications(s);
}

function has_besieged_enemy_fortifications(s) {
	return is_space_besieged(s) && has_enemy_fortifications(s);
}

function has_unbesieged_enemy_fort_or_fortress(s) {
	return is_space_unbesieged(s) && has_enemy_fort_or_fortress(s);
}

function has_non_moving_unbesieged_friendly_units(s) {
	let force = moving_piece();
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p) {
		if (is_piece_unbesieged_in_space(p, s)) {
			if (!is_piece_in_force(p, force))
				return true;
		}
	}
	return false;
}

function has_unbesieged_friendly_units(s) {
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
		if (is_piece_unbesieged_in_space(p, s))
			return true;
	return false;
}

function has_besieged_friendly_units(s) {
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
		if (is_piece_besieged_in_space(p, s))
			return true;
	return false;
}

function count_militia_in_department(box) {
	let n = 0;
	if (box === ST_LAWRENCE_CANADIAN_MILITIAS) {
		for (let p = first_french_militia; p <= last_french_militia; ++p) {
			if (piece_node(p) === box)
				++n;
		}
	} else {
		for (let p = first_british_militia; p <= last_british_militia; ++p) {
			if (piece_node(p) === box)
				++n;
		}
	}
	return n;
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
			if (is_auxiliary(p))
				++ax_count;
			else
				only_ax = false;
		});
		return only_ax && ax_count === 1;
	}
	return is_auxiliary(who);
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

function force_has_supplied_drilled_troops(who) {
	if (force_has_drilled_troops(who))
		return is_in_supply(piece_space(who));
	return false;
}

function force_has_auxiliary(who) {
	if (is_leader(who)) {
		let has_ax = false;
		for_each_unit_in_force(who, p => {
			if (is_auxiliary(p))
				has_ax = true;
		});
		return has_ax;
	}
	return is_auxiliary(who);
}

function force_has_only_auxiliary_units(who) {
	if (is_leader(who)) {
		let only_ax = true;
		for_each_unit_in_force(who, p => {
			if (!is_auxiliary(p))
				only_ax = false;
		});
		return only_ax;
	}
	return is_auxiliary(who);
}

function is_raid_space(s) {
	if (has_friendly_fort(s))
		return false;
	if (has_friendly_fortress(s))
		return false;
	if (has_friendly_stockade(s))
		return false;
	if (has_friendly_drilled_troops(s))
		return false;

	if (is_originally_enemy(s))
		return true;
	if (has_enemy_stockade(s))
		return true;
	if (has_enemy_allied_settlement(s))
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

function find_friendly_commanding_leader_in_space(s) {
	let commander = 0;
	for (let p = first_friendly_leader; p <= last_friendly_leader; ++p)
		if (is_piece_in_space(p, s))
			if (!commander || leader_command(p) > leader_command(commander))
				commander = p;
	return commander;
}

function find_enemy_commanding_leader_in_space(s) {
	let commander = 0;
	for (let p = first_enemy_leader; p <= last_enemy_leader; ++p)
		if (is_piece_in_space(p, s))
			if (!commander || leader_command(p) > leader_command(commander))
				commander = p;
	return commander;
}

// GAME STATE CHANGE HELPERS

function log_vp(n) {
	if (game.active === FRANCE) {
		if (n < 0)
			log(`France lost ${-n} VP.`);
		else
			log(`France gained ${n} VP.`);
	} else {
		if (n < 0)
			log(`Britain gained ${-n} VP.`);
		else
			log(`Britain lost ${n} VP.`);
	}
}

function award_vp(n) {
	if (game.active === FRANCE) {
		log_vp(n);
		game.vp += n;
	} else {
		log_vp(-n);
		game.vp -= n;
	}
}

function award_french_vp(n) {
	log_vp(n);
	game.vp += n;
}

function award_british_vp(n) {
	log_vp(-n);
	game.vp -= n;
}

function remove_friendly_stockade(s) {
	remove_from_array(player.stockades, s);
}

function remove_friendly_fort_uc(s) {
	remove_from_array(player.forts_uc, s);
}

function remove_friendly_fort(s) {
	remove_from_array(player.forts, s);
}

function remove_enemy_fort_uc(s) {
	remove_from_array(enemy_player.forts_uc, s);
}

function place_friendly_fort(s) {
	remove_friendly_stockade(s);
	remove_friendly_fort_uc(s);
	player.forts.push(s);
}

function place_friendly_fort_uc(s) {
	player.forts_uc.push(s);
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
	set_unit_reduced(p, 0);
	if (game.summary && game.summary.restored)
		push_summary(game.summary.restored, p);
	else
		// log(`Restored ${piece_name_and_place(p)}.`);
		log(`${piece_name_and_place(p)} restored.`);
}

function reduce_unit(p, verbose=true) {
	if (is_unit_reduced(p)) {
		eliminate_piece(p, verbose);
		return true;
	}
	if (game.summary && game.summary.reduced)
		push_summary(game.summary.reduced, p);
	else if (verbose)
		// log(`Reduced ${piece_name_and_place(p)}.`);
		log(`${piece_name_and_place(p)} reduced.`);
	else
		// log(`Reduced ${piece_name(p)}.`);
		log(`${piece_name(p)} reduced.`);
	set_unit_reduced(p, 1);
	return false;
}

function eliminate_piece(p, verbose=true) {
	if (game.summary && game.summary.eliminated)
		push_summary(game.summary.eliminated, p);
	else if (verbose)
		// log(`Eliminated ${piece_name_and_place(p)}.`);
		log(`${piece_name_and_place(p)} eliminated.`);
	else
		// log(`Eliminated ${piece_name(p)}.`);
		log(`${piece_name(p)} eliminated.`);
	unstack_force(p);
	set_unit_reduced(p, 0);
	game.location[p] = 0;
	if (is_indian(p)) {
		let home = indians.space_from_piece[p];
		if (home) {
			if (is_indian_tribe_eliminated(home)) {
				log(`Removed ${indians.tribe_from_space[home]} allied marker.`);
				if (is_british_indian(p))
					remove_from_array(game.british.allied, home);
				else
					remove_from_array(game.french.allied, home);
			}
		}
	}
}

function eliminate_indian_tribe(s) {
	for (let p of indians.pieces_from_space[s])
		if (is_piece_unbesieged(p))
			eliminate_piece(p);
}

function is_indian_tribe_eliminated(s) {
	for (let p of indians.pieces_from_space[s])
		if (is_piece_on_map(p))
			return false;
	return true;
}

function move_piece_to(who, to) {
	game.location[who] = to;
}

function is_seven_command_leader(who) {
	return who === ABERCROMBY || who === AMHERST || who === BRADDOCK || who === LOUDOUN;
}

function place_piece(who, to) {
	game.location[who] = to;

	if (game.summary && game.summary.placed)
		push_summary(game.summary.placed, who);
	else
		// log(`Placed ${piece_name_and_place(who)}.`);
		log(`${piece_name_and_place(who)} placed.`);

	// remember last placed 7-command leader(s)
	if (is_seven_command_leader(who)) {
		if (count_7_command_leaders_in_play() >= 2) {
			if (game.seven)
				game.seven.push(who);
			else
				game.seven = [ who ];
		}
	}

	if (is_indian(who)) {
		let home = indians.space_from_piece[who];
		if (home) {
			if (is_british_indian(who)) {
				if (!game.british.allied.includes(home)) {
					log(`Placed ${indians.tribe_from_space[home]} allied marker.`);
					game.british.allied.push(home);
				}
			} else {
				if (!game.french.allied.includes(home)) {
					log(`Placed ${indians.tribe_from_space[home]} allied marker.`);
					game.french.allied.push(home);
				}
			}
		}
	}
}

function move_pieces_from_node_to_node(from, to) {
	for (let p = 1; p <= last_piece; ++p) {
		if (piece_node(p) === from)
			move_piece_to(p, to);
	}
}

function capture_enemy_fortress(s) {
	log(`Captured fortress at ${space_name(s)}.`);
	remove_from_array(enemy_player.fortresses, s);
	player.fortresses.push(s);
	award_vp(3);
}

function recapture_french_fortress(s) {
	log(`France recaptured fortress at ${space_name(s)}.`);
	remove_from_array(game.british.fortresses, s);
	game.french.fortresses.push(s);
	award_french_vp(3);
}

function recapture_british_fortress(s) {
	log(`Britain recaptured fortress at ${space_name(s)}.`);
	remove_from_array(game.french.fortresses, s);
	game.british.fortresses.push(s);
	award_british_vp(3);
}

function capture_enemy_fort_intact(s) {
	log(`Captured intact fort at ${space_name(s)}.`);
	remove_from_array(enemy_player.forts, s);
	player.forts.push(s);
	award_vp(2);
}

function capture_enemy_fort(s) {
	log(`Captured fort at ${space_name(s)}.`);
	remove_from_array(enemy_player.forts, s);
	player.forts_uc.push(s);
	award_vp(2);
}

function capture_enemy_stockade(s) {
	log(`Captured stockade at ${space_name(s)}.`);
	remove_from_array(enemy_player.stockades, s);
	player.stockades.push(s);
	award_vp(1);
}

function destroy_enemy_stockade_after_battle(s) {
	log(`Destroyed stockade at ${space_name(s)}.`);
	remove_from_array(enemy_player.stockades, s);
	award_vp(1);
}

function destroy_enemy_stockade_in_raid(s) {
	log(`Destroyed stockade at ${space_name(s)}.`);
	remove_from_array(enemy_player.stockades, s);
}

function add_raid(who) {
	let where = piece_space(who);
	if (where && !game.raid.list.includes(where) && is_raid_space(where))
		game.raid.list.push(where);
}

function is_fort_or_fortress_vacant_of_besieging_units(s) {
	if (has_french_fort(s) || is_french_fortress(s))
		return !has_british_units(s);
	else
		return !has_french_units(s);
}

function lift_sieges_and_amphib() {
	// Lift sieges
	for_each_siege(s => {
		if (is_fort_or_fortress_vacant_of_besieging_units(s)) {
			log(`Lifted siege at ${space_name(s)}.`);
			for (let p = 1; p <= last_piece; ++p)
				if (is_piece_in_space(p, s))
					set_piece_outside(p);
			delete game.sieges[s];
		}
	});

	// Remove amphib
	for (let i = game.amphib.length-1; i >= 0; --i) {
		let s = game.amphib[i];
		if (!has_british_units(s)) {
			if (has_french_drilled_troops(s) || (s !== LOUISBOURG && has_unbesieged_french_fortification(s))) {
				log(`Removed Amphib at ${space_name(s)}.`);
				game.amphib.splice(i, 1);
			}
		}
	}

	// Recapture abandoned enemy fortresses.
	for (let s of originally_french_fortresses)
		if (game.british.fortresses.includes(s) && is_french_controlled_space(s))
			recapture_french_fortress(s);
	for (let s of originally_british_fortresses)
		if (game.french.fortresses.includes(s) && is_british_controlled_space(s))
			recapture_british_fortress(s);

	// Check ownership of other VP locations:
	update_vp("niagara", NIAGARA);
	update_vp("ohio_forks", OHIO_FORKS);
}

function update_vp(name, s) {
	let fr = has_french_units(s) || has_french_fortifications(s);
	let br = has_british_units(s) || has_british_fortifications(s);
	if (fr && !br) {
		if (game[name] < 0) {
			log("France captured " + space_name(s) + ".");
			award_french_vp(1);
			game[name] = 1;
		}
	} else if (br && !fr) {
		if (game[name] > 0) {
			log("Britain captured " + space_name(s) + ".");
			award_british_vp(1);
			game[name] = -1;
		}
	}
}

// SUPPLY LINES

function search_supply_spaces_imp(queue) {
	// console.log("======");
	let reached = queue.slice();
	while (queue.length > 0) {
		let current = queue.shift();
		// If we must have come here by water way:
		let cultivated = is_cultivated(current) || has_friendly_fortifications(current) || has_friendly_amphib(current);
		// console.log("SUPPLY", space_name(current), cultivated);
		for_each_exit_with_type(current, (next, type) => {
			if (reached.includes(next))
				return; // continue
			if (has_unbesieged_enemy_units(next) || has_unbesieged_enemy_fortifications(next))
				return; // continue
			if (!cultivated) {
				// came from wilderness by water, must continue by water
				if (type !== 'land') {
					// console.log("    ", space_name(next), "(adjacent-water)");
					reached.push(next);
					queue.push(next);
				}
			} else {
				// came from cultivated by any path, may continue to cultivated or by water
				if (is_cultivated(next) || has_friendly_fortifications(next) || has_friendly_amphib(next) || type !== 'land') {
					// console.log("    ", space_name(next), "(from land)");
					reached.push(next);
					queue.push(next);
				}
			}
		});
	}
	// console.log("====\nSUPPLY", reached.map(space_name).join("\nSUPPLY "));
	return reached;
}

function search_supply_spaces() {
	if (game.active === FRANCE) {
		let list = originally_french_fortresses.filter(is_friendly_controlled_space);
		supply_cache = search_supply_spaces_imp(list);
	} else {
		let list = originally_british_fortresses_and_all_ports.filter(is_friendly_controlled_space);
		for (let s of game.amphib)
			if (!list.includes(s) && is_space_unbesieged(s))
				list.push(s);
		supply_cache = search_supply_spaces_imp(list);
	}
}

function is_in_supply(from) {
	if (game.active === BRITAIN && has_amphib(from))
		return true;
	if (!supply_cache)
		search_supply_spaces();
	if (supply_cache.includes(from))
		return true;
	let x = false;
	for_each_exit(from, next => {
		if (supply_cache.includes(next))
			x = true;
	})
	return x;
}

function query_supply() {
	let reply = {};
	set_active(BRITAIN);
	search_supply_spaces();
	reply.british = supply_cache;
	set_active(FRANCE);
	search_supply_spaces();
	reply.french = supply_cache;
	return reply;
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
		if (dist > stop)
			break;
		if (has_unbesieged_friendly_fortifications(here)) {
			stop = dist;
			result.push(here);
		}
		if (dist < stop) {
			for_each_exit(here, next => {
				if (!(next in seen))
					queue.push([next, dist+1]);
				seen[next] = 1;
			});
		}
	}

	return result;
}

// SEQUENCE OF PLAY

function place_amherst_forbes_and_wolfe_in_pool() {
	log("Placed Amherst, Forbes, and Wolfe into the British leader pool.");
	game.british.pool.push(AMHERST);
	game.british.pool.push(FORBES);
	game.british.pool.push(WOLFE);
}

function start_year() {
	if (game.year === 1759 && !game.events.pitt)
		place_amherst_forbes_and_wolfe_in_pool();
	game.season = EARLY;
	start_season();
}

function start_season() {
	switch (game.season) {
	case EARLY:
		logbr();
		log(`.h1 Early Season of ${game.year}`);
		logbr();
		break;
	case LATE:
		logbr();
		log(`.h1 Late Season of ${game.year}`);
		logbr();
		break;
	}

	deal_cards();

	if (game.options.regulars_from_discard && game.year >= 1757) {
		let found = false;
		for (let c of game.discard) {
			if (cards[c].event === 'british_regulars' || cards[c].event === 'highlanders') {
				found = true;
				break;
			}
		}
		if (found) {
			set_active(BRITAIN);
			game.state = 'discard_to_draw_regulars';
			return;
		}
	}

	start_action_phase();
}

function start_action_phase() {
	if (game.events.quiberon)
		set_active(BRITAIN);
	else
		set_active(FRANCE);
	resume_action_phase();
}

function end_season() {
	if (game.british.hand.length > 0)
		game.british.held = 1;
	else
		game.british.held = 0;

	if (game.french.hand.length > 0)
		game.french.held = 1;
	else
		game.french.held = 0;

	delete game.events.french_regulars;
	delete game.events.british_regulars;
	delete player.passed;
	delete enemy_player.passed;

	if (game.season === EARLY) {
		game.season = LATE;
		start_season();
	} else {
		end_late_season();
	}
}

function end_late_season() {
	logbr();
	log(".h2 End Late Season");
	logbr();
	delete game.events.no_amphib;
	delete game.events.blockhouses;
	goto_indians_and_leaders_go_home();
}

function resume_action_phase() {
	game.state = 'action_phase';
	logbr();
	log(`.h2 ${game.active}`);
	logbr();
}

function end_action_phase() {
	flush_summary();

	lift_sieges_and_amphib();
	clear_undo();
	game.count = 0;

	if (!enemy_player.passed && enemy_player.hand.length > 0) {
		set_active_enemy();
		resume_action_phase();
		return;
	}

	if (!player.passed && player.hand.length > 0) {
		resume_action_phase();
		return;
	}

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
	gen_action('discard', card);
}

function card_name(card) {
	return `#${card} ${cards[card].name} [${cards[card].activation}]`;
}

function play_card(card) {
	log(`${game.active} played\n${card_name(card)}.`);
	remove_from_array(player.hand, card);
	game.last_card = card;
	if (cards[card].special === 'remove')
		game.removed.push(card);
	else
		game.discard.push(card);
}

function discard_card(card, reason) {
	if (reason)
		log(`${game.active} discarded\n${card_name(card)}\n${reason}.`);
	else
		log(`${game.active} discarded\n${card_name(card)}.`);
	remove_from_array(player.hand, card);
	game.last_card = card;
	game.discard.push(card);
}

function remove_card(card) {
	remove_from_array(game.discard, card);
	game.removed.push(card);
}

states.action_phase = {
	prompt() {
		view.prompt = "Action Phase: Play a card.";
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
		logbr();
		play_card(card);
		events[cards[card].event].play(card);
	},
	activate_force(card) {
		logbr();
		goto_activate_force(card);
	},
	activate_individually(card) {
		logbr();
		goto_activate_individually(card);
	},
	construct_stockades(card) {
		logbr();
		goto_construct_stockades(card);
	},
	construct_forts(card) {
		logbr();
		goto_construct_forts(card);
	},
	discard(card) {
		logbr();
		player.did_construct = 0;
		discard_card(card);
		end_action_phase();
	},
	pass() {
		logbr();
		log(game.active + " passed.");
		player.passed = 1;
		end_action_phase();
	},
}

// ACTIVATION

function goto_activate_individually(card) {
	push_undo();
	player.did_construct = 0;
	discard_card(card, "to activate units individually");
	game.state = 'activate_individually';
	game.activation_value = 0;
	game.count = cards[card].activation;
	game.activation = [];
}

function goto_activate_force(card) {
	push_undo();
	player.did_construct = 0;
	discard_card(card, "to activate a force");
	game.state = 'activate_force';
	game.activation_value = cards[card].activation;
}

events.campaign = {
	play() {
		game.state = 'select_campaign_1';
		game.activation_value = 3;
		game.activation = [];
	}
}

states.activate_individually = {
	prompt() {
		view.prompt = `Activate units and/or leaders individually${format_remain(game.count)}.`;
		gen_action_next();
		if (game.count >= 1) {
			for (let p = first_friendly_leader; p <= last_friendly_leader; ++p) {
				if (is_piece_on_map(p) && !game.activation.includes(p)) {
					gen_action_piece(p);
				}
			}
		}
		if (game.count > 0) {
			for (let p = first_friendly_unit; p <= last_friendly_unit; ++p) {
				if (is_piece_on_map(p) && !game.activation.includes(p)) {
					if (game.count >= 0.5) {
						if (is_indian(p))
							gen_action_piece(p);
					}
					if (game.count >= 1) {
						if (is_ranger(p))
							gen_action_piece(p);
						if (is_coureurs(p))
							gen_action_piece(p);
						if (is_drilled_troops(p))
							if (game.activation.length === 0)
								gen_action_piece(p);
					}
				}
			}
		}
	},
	piece(p) {
		push_undo();
		game.activation.push(p);
		if (is_drilled_troops(p))
			game.count = 0;
		else if (is_indian(p))
			game.count -= 0.5;
		else
			game.count -= 1.0;
	},
	next() {
		push_undo();
		goto_pick_first_move();
	},
}

states.activate_force = {
	prompt() {
		view.prompt = "Activate a Force.";
		for (let p = first_friendly_leader; p <= last_friendly_leader; ++p)
			if (is_piece_on_map(p) && leader_initiative(p) <= game.activation_value)
				gen_action_piece(p);
	},
	piece(p) {
		push_undo();
		game.force = {
			commander: p,
			reason: 'move',
		};
		game.state = 'designate_force';
	},
}

states.select_campaign_1 = {
	inactive: "campaign",
	prompt() {
		view.prompt = "Campaign: Select the first leader.";
		for (let p = first_friendly_leader; p <= last_friendly_leader; ++p) {
			if (is_piece_on_map(p))
				if (!game.activation.includes(p))
					gen_action_piece(p);
		}
	},
	piece(p) {
		push_undo();
		game.force = {
			commander: p,
			reason: 'campaign_1',
		};
		game.state = 'designate_force';
	},
}

states.select_campaign_2 = {
	inactive: "campaign",
	prompt() {
		view.prompt = "Campaign: Select the second leader.";
		for (let p = first_friendly_leader; p <= last_friendly_leader; ++p) {
			if (is_piece_on_map(p) && !is_piece_in_force(p, game.activation[0]))
				if (!game.activation.includes(p))
					gen_action_piece(p);
		}
	},
	piece(p) {
		push_undo();
		game.force = {
			commander: p,
			reason: 'campaign_2',
		};
		game.state = 'designate_force';
	},
}

function goto_pick_first_move() {
	if (game.activation.length > 1) {
		logbr();
		log("Selected\n" + game.activation.map(piece_name_and_place).join(",\n") + ".");
		game.state = 'pick_move';
	} else {
		goto_move_piece(game.activation.pop());
	}
}

function goto_pick_next_move() {
	if (game.activation && game.activation.length > 0) {
		game.state = 'pick_move';
	} else {
		delete game.activation_value;
		delete game.activation;
		end_action_phase();
	}
}

states.pick_move = {
	prompt() {
		view.prompt = "Pick the next activated force, leader, or unit to move."
		game.activation.forEach(gen_action_piece);
	},
	piece(p) {
		remove_from_array(game.activation, p);
		goto_move_piece(p);
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
	goto_pick_next_move();
}

// DEFINE FORCE (for various actions)

function force_has_british_iroquois_and_mohawk_units(commander) {
	let has_br_indians = false;
	for_each_friendly_unit_in_node(leader_box(commander), p => {
		if (is_british_iroquois_or_mohawk(p))
			has_br_indians = true;
		gen_action_piece(p);
	});
	return has_br_indians;
}

function can_drop_off_leader(commander, subordinate) {
	if (subordinate === JOHNSON)
		if (force_has_british_iroquois_and_mohawk_units(commander))
			return false;
	return count_non_british_iroquois_and_mohawk_units_in_force(commander) <= force_command(commander) - leader_command(subordinate);
}

const designate_force_reason_prompt = {
	'campaign_1': "for first campaign",
	'campaign_2': "for second campaign",
	'move': "to move",
	'intercept': "to intercept",
	'avoid': "to avoid battle",
}

states.designate_force = {
	get inactive() {
		return "designate force " + designate_force_reason_prompt[game.force.reason];
	},
	prompt() {
		let commander = game.force.commander;
		let where = piece_space(commander);

		// 5.534 Johnson commands British Iroquois and Mohawk units for free
		let cmd_use = count_non_british_iroquois_and_mohawk_units_in_force(commander);
		let cmd_cap = force_command(commander);

		view.prompt = `Designate force ${designate_force_reason_prompt[game.force.reason]} with ${piece_name(commander)} from ${space_name(where)} (${cmd_use}/${cmd_cap}).`;
		view.who = commander;

		let can_pick_up = false;

		// pick up sub-commanders
		for_each_friendly_leader_in_node(where, p => {
			if (game.force.reason === 'avoid' && is_piece_inside(p))
				return; // continue
			if (p !== commander && leader_command(p) <= leader_command(commander)) {
				can_pick_up = true;
				gen_action_piece(p);
			}
		});

		// pick up units
		for_each_friendly_unit_in_node(where, p => {
			if (game.force.reason === 'avoid' && is_piece_inside(p))
				return; // continue
			if (is_british_iroquois_or_mohawk(p)) {
				// 5.534 Only Johnson can command British Iroquois and Mohawk (and for free)
				if (is_piece_in_force(JOHNSON, commander)) {
					can_pick_up = true;
					gen_action_piece(p);
				}
			} else {
				if (cmd_use < cmd_cap) {
					can_pick_up = true;
					gen_action_piece(p);
				}
			}
		});

		// drop off sub-commanders
		for_each_friendly_leader_in_node(leader_box(commander), p => {
			if (can_drop_off_leader(commander, p))
				gen_action_piece(p);
		});

		// drop off units
		for_each_friendly_unit_in_node(leader_box(commander), p => {
			gen_action_piece(p);
		});

		if (can_pick_up)
			gen_action('pick_up_all');

		// Must be a force to proceed (leader + at least one unit)
		if (count_units_in_force(commander) > 0)
			gen_action_next();
	},

	pick_up_all() {
		push_undo();

		let commander = game.force.commander;
		let where = piece_space(commander);
		let box = leader_box(commander);

		// pick up all sub-commanders
		for_each_friendly_leader_in_node(where, p => {
			if (game.force.reason === 'avoid' && is_piece_inside(p))
				return; // continue
			if (p !== commander && leader_command(p) <= leader_command(commander))
				move_piece_to(p, box);
		});

		// pick up as many units as possible
		for_each_friendly_unit_in_node(where, p => {
			if (game.force.reason === 'avoid' && is_piece_inside(p))
				return; // continue
			if (is_british_iroquois_or_mohawk(p)) {
				// 5.534 Only Johnson can command British Iroquois and Mohawk (and for free)
				if (is_piece_in_force(JOHNSON, commander))
					move_piece_to(p, box);
			} else {
				if (count_non_british_iroquois_and_mohawk_units_in_force(commander) <= force_command(commander))
					move_piece_to(p, box);
			}
		});
	},

	piece(p) {
		push_undo();
		let commander = game.force.commander;
		let where = piece_space(commander);
		if (piece_node(p) === leader_box(commander))
			move_piece_to(p, where);
		else
			move_piece_to(p, leader_box(commander));
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
			goto_pick_first_move();
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

// TODO: merge with designate_force using reason=intercept_lone_ax
states.designate_force_lone_ax = {
	inactive: "designate lone auxiliary force to intercept",
	prompt() {
		let commander = game.force.commander;
		let where = piece_space(commander);
		let n = count_units_in_force(commander);

		view.prompt = `Designate lone auxiliary force to intercept with ${piece_name(commander)} from ${space_name(where)}.`;
		view.who = commander;

		// pick up sub-commanders
		for_each_friendly_leader_in_node(where, p => {
			if (p !== commander && leader_command(p) <= leader_command(commander))
				gen_action_piece(p);
		});

		// pick up units (max 1 auxiliary)
		if (n === 0) {
			for_each_friendly_unit_in_node(where, p => {
				if (is_auxiliary(p)) {
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

		// drop off sub-commanders
		for_each_friendly_leader_in_node(leader_box(commander), p => {
			if (!(p === JOHNSON && force_has_british_iroquois_and_mohawk_units(commander)))
				gen_action_piece(p);
		});

		// drop off units
		for_each_friendly_unit_in_node(leader_box(commander), p => {
			gen_action_piece(p);
		});

		if (n === 1)
			gen_action_next();
	},

	piece(p) {
		push_undo();
		let commander = game.force.commander;
		let where = piece_space(commander);
		if (piece_node(p) === leader_box(commander))
			move_piece_to(p, where);
		else
			move_piece_to(p, leader_box(commander));
	},

	next() {
		push_undo();
		attempt_intercept();
	},
}

// MOVE

function describe_force(force, verbose) {
	if (is_leader(force) && count_pieces_in_force(force) > 1) {
		let desc = verbose ? piece_name_and_place(force) : piece_name(force);
		for_each_piece_in_force(force, p => {
			if (p !== force)
				desc += ",\n" + piece_name(p);
		});
		return desc;
	} else {
		return piece_name_and_place(force);
	}
}

function goto_move_piece(who) {
	clear_undo();

	logbr();
	log(`Activated\n${describe_force(who, true)}.`);

	let from = piece_space(who);
	game.state = 'move';
	game.move = {
		where: from,
		came_from: 0,
		type: (from === HALIFAX || from === LOUISBOURG) ? 'naval' : 'boat-or-land',
		used: -1,
		did_carry: 0,
		infiltrated: 0,

		moving: who,
		intercepting: 0,
		avoiding: 0,

		intercepted: [],
		did_attempt_intercept: 0,
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
		view.who = moving_piece();
		view.where = where;
		if (is_assault_possible(where)) {
			if (player.hand.includes(SURRENDER)) {
				view.prompt = `You may assault at ${space_name(where)}, play "Surrender!", or move.`;
				gen_action('play_event', SURRENDER);
			} else {
				view.prompt = `You may assault at ${space_name(where)} or move.`;
			}
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
	play_event(c) {
		game.siege_where = moving_piece_space();
		play_card(c);
		goto_surrender();
	},
	move() {
		resume_move();
	},
}

function goto_break_siege() {
	let here = moving_piece_space();
	game.move.came_from = here;
	goto_avoid_battle();
}

function piece_can_naval_move_from(who, from) {
	if (game.events.foul_weather)
		return false;
	if (game.active === FRANCE && game.no_fr_naval)
		return false;
	if (is_leader(who) && count_pieces_in_force(who) > 1)
		if (game.activation_value < 3)
			return false;

	if (game.active === FRANCE) {
		if (from === LOUISBOURG || from === QUEBEC)
			return is_friendly_controlled_space(from);
		return false;
	}

	if (game.active === BRITAIN) {
		if (has_amphib(from))
			return true;
		if (is_port(from))
			return is_friendly_controlled_space(from);
		return false;
	}

	return false;
}

function max_land_movement_cost() {
	return game.events.foul_weather ? 2 : movement_allowance(moving_piece());
}

function max_movement_cost(type) {
	switch (type) {
	case 'boat-or-land':
	case 'boat': return game.events.foul_weather ? 2 : 9;
	case 'land': return max_land_movement_cost();
	case 'naval': return 9;
	}
}

function resume_move() {
	// Interrupt for Foul Weather response at first opportunity to move.
	if (game.move.used < 0) {
		if (is_enemy_card_available(FOUL_WEATHER)) {
			if (game.options.retroactive) {
				game.retro_foul_weather = JSON.stringify(game);
			} else {
				set_active_enemy();
				game.state = 'foul_weather';
				return;
			}
		}
		game.move.used = 0;
	}

	game.state = 'move';
}

function remove_enemy_forts_uc_in_path(s) {
	if (has_enemy_fort_uc(s)) {
		log(`Removed fort u/c at ${space_name(s)}`);
		remove_enemy_fort_uc(s);
	}
}

function is_land_path(from, to) {
	return spaces[from].land.includes(to);
}

function has_friendly_fortifications_or_cultivated(s) {
	return has_friendly_fortifications(s) || is_originally_friendly(s);
}

function gen_naval_move() {
	let from = moving_piece_space();
	if (!piece_can_naval_move_from(moving_piece(), from))
		return;
	if (game.active === BRITAIN) {
		game.amphib.forEach(to => {
			if (to !== from)
				gen_action_space(to);
		});
		ports.forEach(to => {
			if (to !== from && !game.amphib.includes(to))
				if (is_friendly_controlled_space(to))
					gen_action_space(to);
		});
	}
	if (game.active === FRANCE) {
		if (from !== LOUISBOURG && is_friendly_controlled_space(LOUISBOURG))
			gen_action_space(LOUISBOURG);
		if (from !== QUEBEC && is_friendly_controlled_space(QUEBEC))
			gen_action_space(QUEBEC);
	}
}

function is_carry_connection(from, to) {
	const from_ff = has_friendly_fortifications_or_cultivated(from);
	const to_ff = has_friendly_fortifications_or_cultivated(to);
	return (from_ff && to_ff);
}

function can_move_by_boat_or_land(used, did_carry, from, to) {
	if (is_land_path(from, to)) {
		if (used < max_land_movement_cost())
			return true;
		if (!did_carry)
			return is_carry_connection(from, to);
		return false;
	}
	return true;
}

function can_move_by_boat(used, did_carry, from, to) {
	if (is_land_path(from, to)) {
		if (!did_carry)
			return is_carry_connection(from, to);
		return false;
	}
	return true;
}

function can_move(type, used, carry, from, to) {
	// console.log("CAN_INFILTRATE_MOVE", type, used, carry, space_name(from), ">", space_name(to));
	switch (type) {
	case 'boat-or-land':
		return can_move_by_boat_or_land(used, carry, from, to);
	case 'boat':
		return can_move_by_boat(used, carry, from, to);
	case 'land':
		return true;
	}
	return false;
}

function is_infiltration_move(to) {
	if (has_unbesieged_enemy_fortifications(to))
		return true;
	if (has_unbesieged_enemy_units(to))
		return true;
	return false;
}

function can_infiltrate_search(type, used, carry, from, to) {
	if (can_move(type, used, carry, from, to)) {
		if (!is_infiltration_move(to)) {
			// console.log("  EXIT", space_name(to));
			return true;
		}

		// Downgrade from Boat/Land to Land movement if not going by river or carries.
		if (type === 'boat' || type === 'boat-or-land') {
			if (is_land_path(from, to)) {
				if (!carry) {
					if (is_carry_connection(from, to))
						carry = 1;
					else
						type = 'land';
				} else {
					type = 'land';
				}
			}
			if (used > max_movement_cost('land'))
				type = 'boat';
		}

		// See if we must stop.
		if (type === 'land') {
			const from_ff = has_friendly_fortifications_or_cultivated(from);
			const to_ff = has_friendly_fortifications_or_cultivated(to);
			// Must stop on mountains.
			if (!to_ff && is_mountain(to)) {
				// console.log("  STOP mountain", used);
				return false;
			}
			// Must stop in the next space after passing through enemy cultivated
			if (used > 0 && !from_ff && is_originally_enemy(from)) {
				// console.log("  STOP enemy cultivated");
				return false;
			}
		}

		// Continue looking.
		if (used < max_movement_cost(type)) {
			for (let next of spaces[to].exits) {
				if (can_infiltrate_search(type, used + 1, carry, to, next))
					return true;
			}
		}
	}
	return false;
}

function can_infiltrate(from, to) {
	// console.log("====");
	let result = can_infiltrate_search(game.move.type, game.move.used, game.move.did_carry, from, to);
	return result;
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
				if (!(has_dt || (is_lone_ax && can_infiltrate(from, to))))
					return; // continue
			}
		}

		switch (game.move.type) {
		case 'boat-or-land':
			if (can_move_by_boat_or_land(game.move.used, game.move.did_carry, from, to))
				gen_action_space(to);
			break;
		case 'boat':
			if (can_move_by_boat(game.move.used, game.move.did_carry, from, to))
				gen_action_space(to);
			break;
		case 'land':
			gen_action_space(to);
			break;
		}
	});
}

function stop_move() {
	game.move.used = 9;
}

function stop_land_move() {
	if (game.move.type === 'boat-or-land')
		game.move.type = 'boat';
	else
		game.move.used = 9;
}

function apply_move(to) {
	let who = moving_piece();
	let from = moving_piece_space();

	if (game.move.type === 'naval')
		game.move.used = 9;
	else
		game.move.used ++;
	game.move.where = to;
	game.move.came_from = from;
	game.raid.from[to] = from; // remember where raiders came from so they can retreat after battle

	// Downgrade from Boat/Land to Land movement if not going by river or carries.
	if (game.move.type === 'boat' || game.move.type === 'boat-or-land') {
		if (is_land_path(from, to)) {
			if (!game.move.did_carry) {
				if (is_carry_connection(from, to))
					game.move.did_carry = 1;
				else
					game.move.type = 'land';
			} else {
				game.move.type = 'land';
			}
		}
		if (game.move.used > max_land_movement_cost('land'))
			game.move.type = 'boat';
	}

	if (game.move.type === 'land' || game.move.type === 'boat-or-land') {
		const from_ff = has_friendly_fortifications_or_cultivated(from);
		const to_ff = has_friendly_fortifications_or_cultivated(to);
		const has_dt = force_has_drilled_troops(who);
		const has_ax = force_has_auxiliary(who);

		// Must stop on mountains.
		if (is_mountain(to) && !to_ff)
			stop_land_move();

		// Must stop in the next space after passing through...
		if (game.move.used > 1 && !from_ff) {
			// Drilled Troops that pass through wilderness must stop in the next space.
			if (has_dt && !has_ax && is_wilderness(from))
				if (!game.events.george_croghan)
					stop_land_move();

			// Auxiliaries that pass through enemy cultivated must stop in the next space.
			if (has_ax && !has_dt && is_originally_enemy(from))
				stop_land_move();
		}
	}

	game.move.infiltrated = 0;

	if (has_enemy_stockade(to)) {
		if (is_lone_auxiliary(who) && can_infiltrate(from, to))
			game.move.infiltrated = 1;
		else
			stop_move();
	}

	if (has_unbesieged_enemy_fort_or_fortress(to)) {
		if (is_lone_auxiliary(who) && can_infiltrate(from, to))
			game.move.infiltrated = 1;
		else
			stop_move();
	}

	if (has_unbesieged_enemy_units(to)) {
		if (is_lone_auxiliary(who) && can_infiltrate(from, to))
			game.move.infiltrated = 1;
	}

	if (game.move.infiltrated)
		log(`Infiltrated ${space_name(to)}.`);
	else
		log(`Moved to ${space_name(to)}.`);

	move_piece_to(who, to);
	lift_sieges_and_amphib();
}

states.move = {
	prompt() {
		let who = moving_piece();
		let from = moving_piece_space();

		if (from) {
			view.prompt = `Move ${piece_name_and_place(who)}`;
			switch (game.move.type) {
			case 'boat-or-land':
				view.prompt += " by boat or land";
				if (game.move.did_carry)
					view.prompt += " (carried)";
				break;
			case 'boat':
				view.prompt += " by boat";
				if (game.move.did_carry)
					view.prompt += " (carried)";
				break;
			case 'land':
				view.prompt += " by land";
				break;
			case 'naval':
				if (game.move.used > 0)
					view.prompt += " by ship \u2014 done.";
				else
					view.prompt += " by ship.";
				break;
			}
			if (game.move.infiltrated)
				view.prompt += " (infiltrating)";
			if (game.move.type !== 'naval') {
				if (game.move.used === 9)
					view.prompt += ` \u2014 done.`;
				else
					view.prompt += ` \u2014 ${game.move.used}/${max_movement_cost(game.move.type)}.`;
			}
		} else {
			view.prompt = `${piece_name(who)} eliminated.`;
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

			if (piece_can_naval_move_from(who, from)) {
				if (game.move.type !== 'naval') {
					gen_action('naval_move');
				} else {
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

		if (game.move.infiltrated) {
			if (!has_unbesieged_enemy_fort_or_fortress(from))
				gen_action('stop');
		} else {
			if (game.move.used > 0)
				gen_action_next()
			else
				gen_action_pass()
		}

		gen_action_demolish();

		if (game.move.used < max_movement_cost(game.move.type)) {
			if (game.move.type === 'naval')
				gen_naval_move();
			else
				gen_regular_move();
		}

		if (game.move.used < 9) {
			if (is_leader(who)) {
				for_each_leader_in_force(who, p => {
					if (p !== who && can_drop_off_leader(who, p))
						gen_action_piece(p);
				});
				for_each_unit_in_force(who, p => {
					gen_action_piece(p);
				});
			}
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
				set_active_enemy();
				game.state = 'lake_schooner';
				return goto_retroactive_foul_weather();
			}
		}

		goto_intercept();
	},
	piece(who) {
		push_undo();
		log(`Dropped off ${piece_name(who)}.`);
		move_piece_to(who, moving_piece_space());
		resume_move();
	},
	siege() {
		goto_siege(moving_piece_space());
	},
	assault() {
		goto_assault(moving_piece_space());
	},
	stop() {
		game.move.infiltrated = 0;
		goto_designate_inside();
	},
	next() {
		end_move();
	},
	pass() {
		push_undo();
		game.state = 'confirm_end_move';
	},
	demolish_fort: goto_demolish_fort,
	demolish_stockade: goto_demolish_stockade,
	demolish_fieldworks: goto_demolish_fieldworks,
}

states.confirm_end_move = {
	inactive: "move",
	prompt() {
		view.prompt = `You have not moved yet \u2014 are you sure you want to pass?`;
		view.who = moving_piece();
		gen_action_pass();
	},
	pass() {
		end_move();
	}
}

function goto_retroactive_foul_weather() {
	if (game.options.retroactive && game.retro_foul_weather) {
		console.log("RETRO REWIND");

		let state_start = game.retro_foul_weather;
		delete game.retro_foul_weather;
		let state_next = JSON.stringify(game);

		game = JSON.parse(state_start);
		set_active_enemy();
		game.state = 'foul_weather';
		game.retro_foul_weather = state_next;
	} else {
		clear_undo();
	}
}

states.foul_weather = {
	prompt() {
		let p = moving_piece();
		view.who = p;
		view.where = moving_piece_space();
		if (player.hand.includes(FOUL_WEATHER)) {
			view.prompt = `${piece_name_and_place(p)} is about to move. You may play "Foul Weather".`;
			gen_action('play_event', FOUL_WEATHER);
		} else {
			view.prompt = `${piece_name_and_place(p)} is about to move. You don't have "Foul Weather".`;
		}
		gen_action_pass();
	},
	play_event(c) {
		if (game.options.retroactive) {
			console.log("RETRO STAY");
			delete game.retro_foul_weather;
		}
		play_card(c);
		game.events.foul_weather = 1;
		game.move.used = 0;
		set_active_enemy();
		resume_move();
	},
	pass() {
		if (game.options.retroactive) {
			console.log("RETRO PASS");
			game = JSON.parse(game.retro_foul_weather);
		} else {
			game.move.used = 0;
			set_active_enemy();
			resume_move();
		}
	}
}

states.lake_schooner = {
	prompt() {
		let p = moving_piece();
		let to = moving_piece_space();
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
		set_active_enemy();
		stop_move();
		move_piece_to(who, from);
		log(`${piece_name(who)} stopped at ${space_name(from)}.`);

		// 6.63 eliminate if forced back into enemy-occupied space
		if (has_unbesieged_enemy_units(from) || has_unbesieged_enemy_fortifications(from)) {
			for_each_friendly_piece_in_space(from, p => {
				if (is_piece_unbesieged(p))
					eliminate_piece(p);
			});
		}

		resume_move();
	},
	pass() {
		set_active_enemy();
		goto_intercept();
	}
}

states.amphibious_landing = {
	prompt() {
		let who = moving_piece();
		let from = moving_piece_space();
		view.prompt = `Amphibious Landing: Select a destination for ${piece_name_and_place(who)}.`;
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
		game.amphib.push(to);
		apply_move(to);
		goto_intercept();
	},
}

function remove_siege_marker(where) {
	delete game.sieges[where];
}

function place_siege_marker(where) {
	log(`Started siege at ${space_name(where)}.`);
	game.sieges[where] = 0;
}

function change_siege_marker(where, amount) {
	return game.sieges[where] = clamp(game.sieges[where] + amount, 0, 2);
}

function goto_battle_check() {
	let where = moving_piece_space();
	if (has_unbesieged_enemy_units(where)) {
		goto_battle(where, false);
	} else {
		end_move_step(false);
	}
}

function end_move_step(final=false, overrun=false) {
	let did_battle = !!game.battle;

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
			if (has_enemy_fort(where) || is_fortress(where)) {
				place_siege_marker(where);
			}
			if (has_enemy_stockade(where)) {
				if (has_friendly_drilled_troops(where)) {
					if (did_battle) {
						destroy_enemy_stockade_after_battle(where);
					} else {
						capture_enemy_stockade(where);
						if (can_play_massacre())
							return goto_massacre('move');
					}
				}
			}
			stop_move();
		}
	}

	if (overrun) {
		log(".b Overrun");
		logbr();
	}

	if (!is_lone_leader(who) && is_piece_on_map(who)
		&& has_unbesieged_enemy_leader(where)
		&& !has_unbesieged_enemy_units(where))
		return goto_retreat_lone_leader(where, 'move');

	resume_move();
}

function end_move() {
	let who = moving_piece();

	unstack_force(who);

	delete game.move;

	game.raid.list = [];
	for (let i = 0; i < game.raid.aux.length; ++i)
		add_raid(game.raid.aux[i]);

	goto_pick_raid();

	// Pause for foul weather before any raids are resolved...
	goto_retroactive_foul_weather();
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
					if (is_auxiliary(p)) {
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
				if (is_piece_unbesieged_in_space(JOHNSON, from)) {
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

function goto_intercept() {
	let who = moving_piece();

	let here = moving_piece_space();
	if (force_has_drilled_troops(who))
		remove_enemy_forts_uc_in_path(here);

	if (can_be_intercepted()) {
		game.move.intercepting = 0;
		clear_undo();
		set_active_enemy();
		game.state = 'intercept_who';
		return goto_retroactive_foul_weather();
	}

	if (game.move.infiltrated)
		end_move_step(false);
	else
		goto_designate_inside();
}

function is_moving_piece_lone_ax_in_wilderness_or_mountain() {
	let p = moving_piece();
	let s = moving_piece_space();
	return is_lone_auxiliary(p) && is_wilderness_or_mountain(s);
}

states.intercept_who = {
	prompt() {
		let where = moving_piece_space();
		view.where = where;
		if (game.move.intercepting) {
			view.prompt = `Intercept into ${space_name(where)} with ${piece_name(game.move.intercepting)}.`;
			view.who = game.move.intercepting;
			gen_action_next();
		} else {
			view.prompt = "You may select a force or unit to intercept into " + space_name(where) + ".";
			gen_action_pass();
			gen_intercept();
		}
	},
	piece(p) {
		push_undo();
		let to = moving_piece_space();
		let from = piece_space(p);
		// All units can intercept in same space (even lone ax in wilderness), but no need to designate the force.
		if (is_leader(p)) {
			game.move.intercepting = p;
			game.force = {
				commander: p,
				reason: 'intercept',
			};
			if (is_moving_piece_lone_ax_in_wilderness_or_mountain() && from !== to) {
				game.state = 'designate_force_lone_ax';
			} else {
				game.state = 'designate_force';
			}
		} else {
			game.move.intercepting = p;
		}
	},
	next() {
		attempt_intercept();
	},
	pass() {
		game.move.intercepting = 0;
		end_intercept_fail();
	},
}

function attempt_intercept() {
	let who = intercepting_piece();
	if (is_leader(who)) {
		for_each_piece_in_force(who, p => {
			game.move.intercepted.push(p)
		});
	} else {
		game.move.intercepted.push(who);
	}
	game.move.did_attempt_intercept = 1;

	let die = roll_die("to intercept with\n" + describe_force(who, true));
	if (is_leader(who))
		die = modify(die, leader_tactics(who), "leader tactics");
	if (die >= 4) {
		log("Intercepted!");
		end_intercept_success();
	} else {
		log("Failed.");
		end_intercept_fail();
	}
}

function end_intercept_fail() {
	let who = intercepting_piece();
	if (who)
		unstack_force(who);
	set_active_enemy();
	game.state = 'move';
	if (game.move.infiltrated)
		end_move_step(false);
	else
		goto_designate_inside();
}

function end_intercept_success() {
	let who = intercepting_piece();
	let to = moving_piece_space();
	move_piece_to(who, to);
	unstack_force(who);
	set_active_enemy();
	game.state = 'move';
	goto_designate_inside();
}

// DECLARE INSIDE/OUTSIDE FORTIFICATION

function goto_designate_inside() {
	let where = moving_piece_space();
	if (has_unbesieged_enemy_units_that_did_not_intercept(where)) {
		clear_undo();
		if (is_fortress(where) || has_enemy_fort(where)) {
			set_active_enemy();
			game.state = 'designate_inside';
			return;
		}
	}
	goto_avoid_battle();
}

states.designate_inside = {
	prompt() {
		let where = moving_piece_space();
		view.prompt = "You may withdraw leaders and units into the fortification.";
		view.where = where;
		gen_action_next();
		let n = count_friendly_units_inside(where);
		for_each_friendly_piece_in_space(where, p => {
			if (is_piece_unbesieged(p) && !did_piece_intercept(p)) {
				if (is_leader(p) || is_fortress(where) || n < 4)
					gen_action_piece(p);
			}
		});
	},
	piece(p) {
		push_undo();
		if (is_fortress(moving_piece_space()))
			log(`${piece_name(p)} withdrew into fortress.`);
		else
			log(`${piece_name(p)} withdrew into fort.`);
		set_piece_inside(p);
	},
	next() {
		clear_undo();
		set_active_enemy();
		goto_avoid_battle();
	},
}

// AVOID BATTLE

function goto_avoid_battle() {
	let from = moving_piece_space();
	if (has_unbesieged_enemy_units(from)) {
		if (!game.move.did_attempt_intercept) {
			if (can_enemy_avoid_battle(from)) {
				game.move.avoiding = 0;
				clear_undo();
				set_active_enemy();
				game.state = 'avoid_who';
				return goto_retroactive_foul_weather();
			}
		}
	}
	goto_battle_check();
}

function did_piece_intercept(p) {
	return game.move.intercepted.includes(p);
}

states.avoid_who = {
	inactive: "avoid battle",
	prompt() {
		let from = moving_piece_space();
		view.where = from;
		if (game.move.avoiding) {
			view.prompt = `Avoid battle from ${space_name(from)} with ${piece_name(game.move.avoiding)}.`;
			view.who = game.move.avoiding;
			gen_action_next();
		} else {
			view.prompt = "You may select a force or unit to avoid battle from " + space_name(from) + ".";
			gen_action_pass();
			for_each_friendly_piece_in_space(from, p => {
				if (!did_piece_intercept(p) && is_piece_unbesieged(p))
					gen_action_piece(p);
			});
		}
	},
	piece(p) {
		push_undo();
		if (is_leader(p)) {
			game.move.avoiding = p;
			game.force = {
				commander: p,
				reason: 'avoid',
			};
			game.state = 'designate_force';
		} else {
			game.move.avoiding = p;
		}
	},
	next() {
		attempt_avoid_battle();
	},
	pass() {
		game.move.avoiding = 0;
		end_avoid_battle();
	},
}

function attempt_avoid_battle() {
	let from = moving_piece_space();
	let who = avoiding_piece();

	// 6.8 Exception: Auxiliary and all-Auxiliary forces automatically succeed.
	if (is_wilderness_or_mountain(from) && force_has_only_auxiliary_units(who)) {
		log("Avoided battle from " + spaces[from].type + "\n" + describe_force(who, false) + ".");
		game.state = 'avoid_to';
		return;
	}

	let die = roll_die("to avoid battle with\n" + describe_force(who, false));
	if (is_leader(who))
		die = modify(die, leader_tactics(who), "leader tactics");
	if (die >= 4) {
		game.state = 'avoid_to';
	} else {
		log("Failed.");
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
		let from = moving_piece_space();
		view.prompt = `Avoid battle from ${space_name(from)} \u2014 select where to.`;
		view.who = avoiding_piece();
		view.where = from;
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
		log(`Avoided to ${space_name(to)}.`);
		end_avoid_battle_success(to);
	},
}

function end_avoid_battle_success(to) {
	let who = avoiding_piece();
	move_piece_to(who, to);
	end_avoid_battle();
}

function end_avoid_battle() {
	let who = avoiding_piece();
	if (who)
		unstack_force(who);
	set_active_enemy();
	game.state = 'move';
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
				if (is_piece_unbesieged_in_space(p, where))
					fn(p);
		} else {
			for (let p = first_french_piece; p <= last_french_piece; ++p)
				if (is_piece_unbesieged_in_space(p, where))
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
				log(`Lookup ${die} on column 0.`);
			else if (k === COMBAT_RESULT_TABLE.length - 1)
				log(`Lookup ${die} on column >= 28.`);
			else {
				let a = COMBAT_RESULT_TABLE[k-1][0] + 1;
				let b = COMBAT_RESULT_TABLE[k][0];
				if (a === b)
					log(`Lookup ${die} on column ${b}.`);
				else
					log(`Lookup ${die} on column ${a}-${b}.`);
			}
			return r;
		}
	}
	return NaN;
}

function goto_battle(where, is_assault) {
	clear_undo();

	logbr();
	if (is_assault)
		log(".assault " + space_name(where));
	else if (game.raid.where !== where)
		log(".battle " + space_name(where));
	logbr();

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
	} else if (game.raid.where === where) {
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
				log(`Deactivated ${piece_name_and_place(p)}.`);
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
			if (is_regular(p))
				game.battle.atk_worth_vp = 1;
		});
		if (n_atk > 4)
			game.battle.atk_worth_vp = 1;

		let n_def = 0;
		for_each_defending_piece(p => {
			if (is_unit(p))
				++n_def;
			if (is_regular(p))
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

	// Pause for foul weather before any battles are resolved...
	goto_retroactive_foul_weather();
}

function goto_battle_militia() {
	let box = department_militia(game.battle.where);
	if (box && count_militia_in_department(box) > 0 && !game.raid.where) {
		let first = 0, last = 0;
		switch (box) {
		case ST_LAWRENCE_CANADIAN_MILITIAS:
			set_active(FRANCE);
			first = first_st_lawrence_department;
			last = last_st_lawrence_department;
			break;
		case NORTHERN_COLONIAL_MILITIAS:
			set_active(BRITAIN);
			first = first_northern_department;
			last = last_northern_department;
			break;
		case SOUTHERN_COLONIAL_MILITIAS:
			set_active(BRITAIN);
			first = first_southern_department;
			last = last_southern_department;
			break;
		}
		// 7.3 exception: No Militia if there are enemy raided markers.
		for (let s = first; s <= last; ++s)
			if (has_enemy_raided_marker(s))
				return goto_battle_sortie();
		game.state = 'militia_in_battle';
	} else {
		goto_battle_sortie();
	}
}

states.militia_in_battle = {
	prompt() {
		view.prompt = `You may deploy militia at ${space_name(game.battle.where)}.`;
		let box = department_militia(game.battle.where);
		view.where = game.battle.where;
		if (game.active === FRANCE) {
			for (let p = first_french_militia; p <= last_french_militia; ++p)
				if (piece_node(p) === box)
					gen_action_piece(p);
		} else {
			for (let p = first_british_militia; p <= last_british_militia; ++p)
				if (piece_node(p) === box)
					gen_action_piece(p);
		}
		gen_action_next();
	},
	piece(p) {
		push_undo();
		move_piece_to(p, game.battle.where);
		log(`Deployed ${piece_name(p)}.`);
	},
	next() {
		clear_undo();
		goto_battle_sortie();
	},
}

function goto_battle_sortie() {
	set_active(game.battle.attacker);
	if (has_besieged_friendly_units(game.battle.where)) {
		game.state = 'sortie';
	} else {
		goto_battle_attacker_events();
	}
}

function sortie_with_piece(p) {
	log(`${piece_name(p)} sortied.`);
	game.battle.atk_pcs.push(p);

	// 5.36 unit or leader may not be activated if it participated in combat or assault.
	unstack_piece_from_force(p);
	if (game.activation)
		remove_from_array(game.activation, p);
}

states.sortie = {
	prompt() {
		view.prompt = `You may sortie with besieged units at ${space_name(game.battle.where)}.`;
		view.where = game.battle.where;
		let done = true;
		for (let p = first_friendly_unit; p <= last_friendly_unit; ++p) {
			if (is_piece_besieged_in_space(p, game.battle.where)) {
				if (!game.battle.atk_pcs.includes(p)) {
					gen_action_piece(p);
					done = false;
				}
			}
		}
		if (!done)
			gen_action('pick_up_all');
		gen_action_next();
	},
	piece(p) {
		push_undo();
		sortie_with_piece(p);
	},
	pick_up_all() {
		push_undo();
		for (let p = first_friendly_unit; p <= last_friendly_unit; ++p)
			if (is_piece_besieged_in_space(p, game.battle.where))
				if (!game.battle.atk_pcs.includes(p))
					sortie_with_piece(p);
	},
	next() {
		clear_undo();
		goto_battle_attacker_events();
	},
}

function count_auxiliary_units_in_attack() {
	let n = 0;
	for_each_attacking_piece(p => {
		if (is_auxiliary(p))
			++n;
	});
	return n;
}

function count_auxiliary_units_in_defense() {
	let n = 0;
	for_each_defending_piece(p => {
		if (is_auxiliary(p))
			++n;
	});
	return n;
}

function has_light_infantry_in_attack() {
	let n = 0;
	for_each_attacking_piece(p => {
		if (is_light_infantry(p))
			++n;
	});
	return n > 0;
}

function has_light_infantry_in_defense() {
	let n = 0;
	for_each_defending_piece(p => {
		if (is_light_infantry(p))
			++n;
	});
	return n > 0;
}

function can_play_ambush_in_attack() {
	if (!game.battle.assault && game.events.ambush !== game.battle.attacker) {
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
	if (!game.battle.assault && game.events.ambush !== game.battle.defender) {
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
		let have = [];
		let dont_have = [];
		if (can_play_ambush_in_attack()) {
			let x = false;
			if (player.hand.includes(AMBUSH_1)) {
				gen_action('play_event', AMBUSH_1);
				x = true;
			}
			if (player.hand.includes(AMBUSH_2)) {
				gen_action('play_event', AMBUSH_2);
				x = true;
			}
			if (x)
				have.push('"Ambush"');
			else
				dont_have.push('"Ambush"');
		}
		if (can_play_coehorns_in_attack()) {
			if (player.hand.includes(COEHORNS)) {
				gen_action('play_event', COEHORNS);
				have.push('"Coehorns"');
			} else {
				dont_have.push('"Coehorns"');
			}
		}
		if (can_play_fieldworks_in_attack()) {
			let x = false;
			if (player.hand.includes(FIELDWORKS_1)) {
				gen_action('play_event', FIELDWORKS_1);
				x = true;
			}
			if (player.hand.includes(FIELDWORKS_2)) {
				gen_action('play_event', FIELDWORKS_2);
				x = true;
			}
			if (x)
				have.push('"Fieldworks"');
			else
				dont_have.push('"Fieldworks"');
		}
		view.prompt = `Attacker at ${space_name(game.battle.where)}.`;
		view.where = game.battle.where;
		if (have.length > 0)
			view.prompt += " You may play " + have.join(" or ") + ".";
		if (dont_have.length > 0)
			view.prompt += " You don't have " + dont_have.join(" or ") + ".";
		if (have.length === 0 && dont_have.length === 0)
			view.prompt += " You have no more response events.";
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
		let have = [];
		let dont_have = [];
		if (can_play_ambush_in_defense()) {
			let x = false;
			if (player.hand.includes(AMBUSH_1)) {
				gen_action('play_event', AMBUSH_1);
				x = true;
			}
			if (player.hand.includes(AMBUSH_2)) {
				gen_action('play_event', AMBUSH_2);
				x = true;
			}
			if (x)
				have.push('"Ambush"');
			else
				dont_have.push('"Ambush"');
		}
		if (can_play_fieldworks_in_defense()) {
			let x = false;
			if (player.hand.includes(FIELDWORKS_1)) {
				gen_action('play_event', FIELDWORKS_1);
				x = true;
			}
			if (player.hand.includes(FIELDWORKS_2)) {
				gen_action('play_event', FIELDWORKS_2);
				x = true;
			}
			if (x)
				have.push('"Fieldworks"');
			else
				dont_have.push('"Fieldworks"');
		}
		view.prompt = `Defender at ${space_name(game.battle.where)}.`;
		view.where = game.battle.where;
		if (have.length > 0)
			view.prompt += " You may play " + have.join(" or ") + ".";
		if (dont_have.length > 0)
			view.prompt += " You don't have " + dont_have.join(" or ") + ".";
		if (have.length === 0 && dont_have.length === 0)
			view.prompt += " You have no more response events.";
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
	if ambush === attacker
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
	flush_summary();
	if (game.active === game.battle.attacker)
		goto_atk_leader_check();
	else
		goto_def_leader_check();
}

function end_leader_check() {
	flush_summary();
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

	// Attacker who is wiped out by ambush does not get to fire back!
	if (game.events.ambush === game.battle.defender) {
		if (!some_attacking_piece(is_unit)) {
			game.battle.atk_die = 0;
			game.battle.atk_result = 0;
			return end_atk_fire();
		}
	}

	logbr();
	log(".b Attacker");

	let str = attacker_combat_strength();
	let shift = 0;
	if (game.events.ambush === game.battle.attacker) {
		log(`Strength ${str} \xd7 2 for ambush.`);
		str *= 2;
	} else {
		log(`Strength ${str}.`);
	}

	let die = game.battle.atk_die = roll_die();
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
			let atk_has_ax = some_attacking_piece(p => is_auxiliary(p) || is_light_infantry(p));
			let def_has_ax = some_defending_piece(p => is_auxiliary(p) || is_light_infantry(p));
			if (!atk_has_ax && def_has_ax)
				die = modify(die, -1, "vs auxiliaries in wilderness");
		}
		if (is_cultivated(game.battle.where)) {
			let atk_has_reg = some_attacking_piece(p => is_regular(p));
			let def_has_reg = some_defending_piece(p => is_regular(p));
			if (!atk_has_reg && def_has_reg)
				die = modify(die, -1, "vs regulars in cultivated");
		}
		if (has_amphib(game.battle.where) && game.move && game.move.type === 'naval') {
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

	// Defender who is wiped out by ambush does not get to fire back!
	if (game.events.ambush === game.battle.attacker) {
		if (!some_defending_piece(is_unit)) {
			game.battle.def_die = 0;
			game.battle.def_result = 0;
			return end_def_fire();
		}
	}

	logbr();
	log(".b Defender");

	let str = defender_combat_strength();
	let shift = 0;
	if (game.events.ambush === game.battle.defender) {
		log(`Strength ${str} \xd7 2 for ambush.`);
		str *= 2;
	} else {
		log(`Strength ${str}.`);
	}

	let die = game.battle.def_die = roll_die();
	let p = find_friendly_commanding_leader_in_space(game.battle.where);
	if (p) {
		die = modify(die, leader_tactics(p), "leader tactics");
	}
	if (game.events.coehorns === game.battle.defender) {
		die = modify(die, 2, "for coehorns");
	}

	if (!game.battle.assault) {
		if (is_wilderness_or_mountain(game.battle.where)) {
			let atk_has_ax = some_attacking_piece(p => is_auxiliary(p) || is_light_infantry(p));
			let def_has_ax = some_defending_piece(p => is_auxiliary(p) || is_light_infantry(p));
			if (atk_has_ax && !def_has_ax)
				die = modify(die, -1, "vs auxiliaries in wilderness");
		}
		if (is_cultivated(game.battle.where)) {
			let atk_has_reg = some_attacking_piece(p => is_regular(p));
			let def_has_reg = some_defending_piece(p => is_regular(p));
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
	game.battle.def_caused = 0;
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
		logbr();
		log(".b Attacker Losses");
	} else {
		end_step_losses();
	}
}

function goto_def_step_losses() {
	set_active(game.battle.defender);
	game.battle.atk_caused = 0;
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
		// None to take!
		if (game.battle.units.length === 0)
			end_step_losses();
		else {
			logbr();
			log(".b Defender Losses");
		}
	} else {
		end_step_losses();
	}
}

states.step_losses = {
	prompt() {
		let done = true;
		if (game.battle.step_loss > 0) {
			if (game.battle.dt_loss > 0) {
				for (let i = 0; i < game.battle.units.length; ++i) {
					let p = game.battle.units[i];
					if (is_drilled_troops(p) && !is_unit_reduced(p)) {
						done = false;
						gen_action_piece(p);
					}
				}
				if (done) {
					for (let i = 0; i < game.battle.units.length; ++i) {
						let p = game.battle.units[i];
						if (is_drilled_troops(p)) {
							done = false;
							gen_action_piece(p);
						}
					}
				}
			}
			if (done) {
				for (let i = 0; i < game.battle.units.length; ++i) {
					let p = game.battle.units[i];
					if (!is_unit_reduced(p)) {
						done = false;
						gen_action_piece(p);
					}
				}
			}
			if (done) {
				for (let i = 0; i < game.battle.units.length; ++i) {
					let p = game.battle.units[i];
					done = false;
					gen_action_piece(p);
				}
			}
		}
		if (done) {
			view.prompt = `Apply step losses \u2014 done.`;
			gen_action_next();
		} else {
			if (game.battle.dt_loss > 0)
				view.prompt = `Apply step losses (${game.battle.step_loss} left, ${game.battle.dt_loss} from drilled troops).`;
			else
				view.prompt = `Apply step losses (${game.battle.step_loss} left).`;
		}
	},
	piece(p) {
		push_undo();
		--game.battle.step_loss;
		if (game.battle.dt_loss > 0 && is_drilled_troops(p))
			--game.battle.dt_loss;
		if (reduce_unit(p, false)) {
			remove_from_array(game.battle.atk_pcs, p);
			remove_from_array(game.battle.units, p);
		}
	},
	next() {
		if (game.active === game.battle.attacker)
			game.battle.def_caused = game.battle.def_result - game.battle.step_loss;
		else
			game.battle.atk_caused = game.battle.atk_result - game.battle.step_loss;
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
		if (reduce_unit(p, false))
			remove_from_array(game.raid.units, p);
	},
	next() {
		flush_summary();
		clear_undo();
		goto_raid_leader_check();
	},
}

// LEADER LOSSES

function goto_atk_leader_check() {
	set_active(game.battle.attacker);
	game.battle.leader_check = [];
	if ((game.battle.def_result > 0) && (game.battle.def_die === 1 || game.battle.def_die === 6)) {
		for_each_attacking_piece(p => {
			if (is_leader(p))
				game.battle.leader_check.push(p);
		});
	}
	if (game.battle.leader_check.length > 0) {
		game.state = 'leader_check';
	} else {
		end_leader_check();
	}
}

function goto_def_leader_check() {
	set_active(game.battle.defender);
	game.battle.leader_check = [];
	if ((game.battle.atk_result > 0) && (game.battle.atk_die === 1 || game.battle.atk_die === 6)) {
		for_each_defending_piece(p => {
			if (is_leader(p))
				game.battle.leader_check.push(p);
		});
	}
	if (game.battle.leader_check.length > 0) {
		game.state = 'leader_check';
	} else {
		end_leader_check();
	}
}

states.leader_check = {
	prompt() {
		view.prompt = "Roll for leader losses.";
		for (let i = 0; i < game.battle.leader_check.length; ++i)
			gen_action_piece(game.battle.leader_check[i]);
	},
	piece(p) {
		let die = roll_die("for " + piece_name(p));
		if (die === 1) {
			if (game.battle)
				remove_from_array(game.battle.atk_pcs, p);
			eliminate_piece(p, false);
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
			goto_raiders_go_home();
		}
	} else {
		goto_raiders_go_home();
	}
}

states.raid_leader_check = {
	prompt() {
		view.prompt = "Roll for leader losses.";
		for (let i = 0; i < game.raid.leader_check.length; ++i)
			gen_action_piece(game.raid.leader_check[i]);
	},
	piece(p) {
		let die = roll_die("for " + piece_name(p));
		if (die === 1)
			eliminate_piece(p, false);
		remove_from_array(game.raid.leader_check, p);
		if (game.raid.leader_check.length === 0) {
			delete game.raid.leader_check;
			flush_summary();
			goto_raiders_go_home();
		}
	},
}

// WINNER/LOSER

function return_militia(where) {
	let box = department_militia(where);
	if (box) {
		let n = 0;
		for (let p = 1; p <= last_piece; ++p) {
			if (is_militia(p) && is_piece_in_space(p, where)) {
				move_piece_to(p, box);
				++n;
			}
		}
		if (n > 0) {
			log(`${n} Militia units returned to their box.`);
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

	logbr();

	// 7.8: Determine winner
	let atk_eliminated = count_attacking_units() === 0;
	let def_eliminated = count_unbesieged_enemy_units_in_space(where) === 0;

	let victor;
	if (atk_eliminated && def_eliminated) {
		log("Both sides eliminated.");
		if (game.battle.atk_result > game.battle.def_result)
			victor = game.battle.attacker;
		else
			victor = game.battle.defender;
	} else if (atk_eliminated && !def_eliminated) {
		log("Attacker eliminated.");
		victor = game.battle.defender;
	} else if (!atk_eliminated && def_eliminated) {
		log("Defender eliminated.");
		victor = game.battle.attacker;
	} else {
		if (game.battle.atk_caused > game.battle.def_caused)
			victor = game.battle.attacker;
		else
			victor = game.battle.defender;
	}

	logbr();
	if (victor === game.battle.attacker)
		log(".b Attacker Won");
	else
		log(".b Defender Won");

	if (victor === game.battle.attacker && game.battle.def_worth_vp) {
		if (victor === FRANCE)
			award_french_vp(1);
		else
			award_british_vp(1);
	}
	if (victor === game.battle.defender && game.battle.atk_worth_vp) {
		if (victor === FRANCE)
			award_french_vp(1);
		else
			award_british_vp(1);
	}

	return_militia(game.battle.where);

	if (victor === game.battle.attacker)
		remove_fieldworks(where);

	logbr();

	// Raid battle vs militia
	if (game.raid && game.raid.where > 0) {
		if (victor === game.battle.attacker) {
			goto_raid_events();
		} else {
			if (game.battle.atk_pcs.length > 0)
				retreat_attacker(game.raid.where, game.raid.from[game.raid.where] | 0);
			else
				end_retreat_attacker(game.raid.from[game.raid.where]);
		}
		return;
	}

	// Normal battle

	// 6.712 - Infiltrator must always retreat from fort/fortress even if they win
	if (game.move.infiltrated && has_unbesieged_enemy_fort_or_fortress(game.battle.where))
		victor = game.battle.defender;

	if (victor === game.battle.attacker) {
		if (def_eliminated && game.battle.def_result === 0)
			game.battle.overrun = 1;
		if (has_unbesieged_enemy_pieces(where)) {
			log(".b Defender Retreat");
			goto_retreat_defender();
		} else {
			if (game.battle.overrun) {
				end_move_step(false, true);
			} else {
				end_move_step(true);
			}
		}
	} else {
		/* If attacker must retreat, unbesieged defenders who withdrew inside can come out. */
		if (is_space_unbesieged(where)) {
			for (let p = first_piece; p <= last_piece; ++p)
				if (is_piece_besieged_in_space(p, where))
					set_piece_outside(p);
		}

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
		if (is_piece_besieged_in_space(p, where))
			eliminate_piece(p, false);
}

function determine_winner_assault() {
	let where = game.battle.where;
	let victor;

	logbr();

	if (game.battle.atk_result > game.battle.def_result)
		victor = game.battle.attacker;
	else
		victor = game.battle.defender;

	if (victor === game.battle.attacker) {
		log(".b Attacker Won Assault");
		eliminate_enemy_pieces_inside(where);
		remove_siege_marker(where);
		remove_fieldworks(where);
		if (has_enemy_fortress(where)) {
			capture_enemy_fortress(where);
			if (can_play_massacre())
				return goto_massacre('assault');
		}
		if (has_enemy_fort(where)) {
			capture_enemy_fort(where);
			if (can_play_massacre())
				return goto_massacre('assault');
		}
	} else {
		log(".b Defender Won Assault");
	}

	logbr();

	end_move_step(true);
}

// RETREAT

function can_attacker_retreat_from_to(p, from, to) {
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
	space() {
		let from = game.retreat.from;
		let to = game.retreat.to;
		delete game.retreat;

		// NOTE: Besieged pieces that sortie out are 'inside' so not affected by the code below.
		init_retreat_summary();
		log(".b Attacker Retreat");
		for_each_friendly_piece_in_space(from, p => {
			if (is_piece_unbesieged(p)) {
				if (can_attacker_retreat_from_to(p, from, to)) {
					push_retreat_summary(p, "to " + space_name(to));
					move_piece_to(p, to);
				} else {
					eliminate_piece(p, false);
				}
			}
		});
		flush_retreat_summary();
		flush_summary();
		logbr();
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
			game.raid.from[to] = game.retreat.from;
		return goto_pick_raid();
	}

	// Normal battle
	end_retreat();
}

function goto_retreat_defender() {
	set_active(game.battle.defender);
	game.state = 'retreat_defender';
	init_retreat_summary();
}

function can_defender_retreat_from_to(p, from, to) {
	if (has_unbesieged_enemy_units(to))
		return false;
	if (has_unbesieged_enemy_fortifications(to))
		return false;
	if (game.move && moving_piece_came_from() === to)
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

function can_all_defenders_retreat_from(from) {
	let result = true;
	for_each_unbesieged_friendly_piece_in_space(from, p => {
		if (!can_defender_retreat_from(p, from))
			result = false;
	});
	return result;
}

function can_any_defenders_retreat_from_to(from, to) {
	let result = false;
	for_each_unbesieged_friendly_piece_in_space(from, p => {
		if (can_defender_retreat_from_to(p, from, to))
			result = true;
	});
	return result;
}

function can_any_defenders_retreat_inside(from) {
	let result = false;
	for_each_unbesieged_friendly_piece_in_space(from, p => {
		if (can_defender_retreat_inside(p, from))
			result = true;
	});
	return result;
}

states.retreat_defender = {
	prompt() {
		let from = game.battle.where;
		view.prompt = "Retreat losing leaders and units \u2014";
		view.where = from;
		let can_retreat = false;
		for_each_friendly_piece_in_node(from, p => {
			if (can_defender_retreat_from(p, from)) {
				can_retreat = true;
				gen_action_piece(p);
			}
		});
		if (!can_retreat) {
			view.prompt += " done.";
			gen_action_next();
		} else {
			view.prompt += " select piece to retreat.";
			if (can_all_defenders_retreat_from(from))
				gen_action('pick_up_all');
		}
	},
	piece(piece) {
		push_undo();
		game.battle.who = piece;
		game.state = 'retreat_defender_to';
	},
	pick_up_all() {
		push_undo();
		game.state = 'retreat_all_defenders_to';
	},
	next() {
		clear_undo();
		let from = game.battle.where;
		for_each_friendly_piece_in_space(from, p => {
			if (is_piece_unbesieged(p))
				eliminate_piece(p, false);
		});
		flush_retreat_summary();
		flush_summary();
		logbr();
		end_retreat();
	},
}

states.retreat_defender_to = {
	prompt() {
		let from = game.battle.where;
		let who = game.battle.who;
		view.prompt = "Retreat losing leaders and units \u2014 select where to.";
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
		let from = game.battle.where;
		let who = game.battle.who;
		if (from === to) {
			if (is_fortress(to))
				push_retreat_summary(who, "into fortress");
			else
				push_retreat_summary(who, "into fort");
			set_piece_inside(who);
		} else {
			push_retreat_summary(who, "to " + space_name(to));
			move_piece_to(who, to);
		}
		game.state = 'retreat_defender';
	},
}

states.retreat_all_defenders_to = {
	prompt() {
		let from = game.battle.where;
		view.prompt = "Retreat all losing leaders and units \u2014 select where to.";
		if (game.active === BRITAIN && has_amphib(from)) {
			for_each_british_controlled_port(to => gen_action_space(to));
		}
		if (can_any_defenders_retreat_inside(from))
			gen_action_space(from);
		for_each_exit(from, to => {
			if (can_any_defenders_retreat_from_to(from, to)) {
				gen_action_space(to);
			}
		});
	},
	space(to) {
		push_undo();
		let from = game.battle.where;
		let done = true;
		for_each_unbesieged_friendly_piece_in_space(from, p => {
			if (from === to) {
				if (can_defender_retreat_inside(p, from)) {
					if (is_fortress(to))
						push_retreat_summary(p, "into fortress");
					else
						push_retreat_summary(p, "into fort");
					set_piece_inside(p);
				} else {
					done = false;
				}
			} else {
				if (can_defender_retreat_from_to(p, from, to)) {
					push_retreat_summary(p, "to " + space_name(to));
					move_piece_to(p, to);
				} else {
					done = false;
				}
			}
		});
		if (done)
			game.state = 'retreat_defender';
	},
	next() {
		push_undo();
		game.state = 'retreat_defender';
	}
}

function end_retreat() {
	set_active(game.battle.attacker);
	if (game.battle.overrun) {
		end_move_step(false, overrun);
	} else {
		end_move_step(true);
	}
}

function goto_retreat_lone_leader(from, reason) {
	clear_undo();
	set_active_enemy();
	game.state = 'retreat_lone_leader';
	game.retreat = { from, reason };
}

function pick_unbesieged_leader(s) {
	for (let p = first_friendly_leader; p <= last_friendly_leader; ++p)
		if (is_piece_unbesieged_in_space(p, s))
			return p;
	return 0;
}

states.retreat_lone_leader = {
	prompt() {
		let from = game.retreat.from;
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
		let from = game.retreat.from;
		let who = pick_unbesieged_leader(from);
		eliminate_piece(who);
		resume_retreat_lone_leader(from);
	},
	space(to) {
		let from = game.retreat.from;
		let who = pick_unbesieged_leader(from);
		if (from === to) {
			if (is_fortress(to))
				log(`${piece_name(who)} retreated into fortress.`);
			else
				log(`${piece_name(who)} retreated into fort.`);
			set_piece_inside(who);
		} else {
			log(`${piece_name(who)} retreated to ${space_name(to)}.`);
			move_piece_to(who, to);
		}
		resume_retreat_lone_leader(from);
	},
}

function resume_retreat_lone_leader(from) {
	let who = pick_unbesieged_leader(from);
	if (!who) {
		set_active_enemy();
		switch (game.retreat.reason) {
		case 'indian_alliance':
			delete game.retreat;
			game.state = 'indian_alliance';
			break;
		case 'move':
			delete game.retreat;
			resume_move();
			break;
		}
	}
}

// SIEGE

const SIEGE_TABLE = [ 0, 0, 0, 1, 1, 1, 2, 2 ];

function can_moving_force_siege_or_assault() {
	let leader = moving_piece();
	let where = moving_piece_space();
	if (has_besieged_enemy_fortifications(where)) {
		let commanding = find_friendly_commanding_leader_in_space(where);
		if (leader === commanding && force_has_supplied_drilled_troops(leader)) {
			return true;
		}
	}
	return false;
}

function can_play_coehorns_in_siege(s) {
	return is_friendly_card_available(COEHORNS) && has_friendly_regulars(s);
}

function goto_siege(space) {
	// TODO: unstack here?
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
			view.prompt = `Siege at ${space_name(game.siege_where)}. You may play "Coehorns & Howitzers".`;
			gen_action('play_event', COEHORNS);
		} else {
			view.prompt = `Siege at ${space_name(game.siege_where)}. You don't have "Coehorns & Howitzers".`;
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
	set_active_enemy();
	if (can_play_coehorns_in_siege(game.siege_where))
		game.state = 'siege_coehorns_defender';
	else
		end_siege_coehorns_defender();
}

states.siege_coehorns_defender = {
	prompt() {
		if (player.hand.includes(COEHORNS)) {
			view.prompt = `Siege at ${space_name(game.siege_where)}. You may play "Coehorns & Howitzers".`;
			gen_action('play_event', COEHORNS);
		} else {
			view.prompt = `Siege at ${space_name(game.siege_where)}. You don't have "Coehorns & Howitzers".`;
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
	set_active_enemy();
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
			view.prompt = `Siege at ${space_name(game.siege_where)}. You may play "Surrender!"`;
			gen_action('play_event', SURRENDER);
		} else {
			view.prompt = `Siege at ${space_name(game.siege_where)}. You don't have "Surrender!"`;
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
		return goto_massacre('surrender');
	goto_surrender_place();
}

function goto_surrender_place() {
	set_active_enemy();
	if (has_friendly_units(game.siege_where)) {
		game.state = 'surrender';
		if (game.siege_where === LOUISBOURG)
			game.surrender = find_closest_friendly_unbesieged_fortification(QUEBEC);
		else
			game.surrender = find_closest_friendly_unbesieged_fortification(game.siege_where);
	} else {
		end_surrender();
	}
}

states.surrender = {
	prompt() {
		view.prompt = "Surrender! Place defenders at the closest unbesieged fortification.";
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
	set_active_enemy();
	delete game.surrender;
	delete game.siege_where;
	end_move_step(true);
}

const SIEGE_TABLE_RESULT = {
	0: "No effect.",
	1: "Siege +1.",
	2: "Siege +2."
};

function resolve_siege() {
	let where = game.siege_where;
	logbr();
	log(".siege " + space_name(where));
	logbr();
	let att_leader = find_friendly_commanding_leader_in_space(where);
	let def_leader = find_enemy_commanding_leader_in_space(where);
	let die = roll_die("for siege");
	die = modify(die, leader_tactics(att_leader), "besieging leader");
	if (game.events.coehorns)
		die = modify(die, game.events.coehorns === game.active ? 2 : -2, "for coehorns");
	if (def_leader)
		die = modify(die, -leader_tactics(def_leader), "defending leader");
	if (where === LOUISBOURG)
		die = modify(die, -1, "for Louisbourg");
	let result = SIEGE_TABLE[clamp(die, 0, 7)];
	log(`Lookup ${die} on siege table.`);
	log(SIEGE_TABLE_RESULT[result]);
	if (result > 0) {
		let level = change_siege_marker(where, result);
		log("Siege level " + level + ".");
	}
	goto_assault_possible(where);
}

// ASSAULT

function is_assault_possible(where) {
	let siege_level = game.sieges[where] | 0;
	if (has_enemy_fort(where) && siege_level >= 1)
		return true;
	if (has_enemy_fortress(where) && siege_level >= 2)
		return true;
	return false;
}

function goto_assault_possible(where) {
	if (is_assault_possible(where)) {
		game.state = 'assault_possible';
		game.assault_possible = where;
	} else {
		end_move_step(true);
	}
}

states.assault_possible = {
	prompt() {
		view.prompt = `You may assault at ${space_name(game.assault_possible)}.`;
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
		log("Did not assault " + space_name(where));
		end_move_step(true);
	},
}

function goto_assault(where) {
	// TODO: unstack here?
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
		view.prompt = "Pick the next raid space.";
		for (let i=0; i < game.raid.list.length; ++i)
			gen_action_space(game.raid.list[i]);
	},
	space(s) {
		logbr();
		log(".raid " + space_name(s));
		logbr();
		game.raid.where = s;
		remove_from_array(game.raid.list, s);
		goto_raid_militia();
	},
}

function goto_raid_militia() {
	let where = game.raid.where;
	if (has_enemy_stockade(where) && enemy_department_has_at_least_n_militia(where, 1)) {
		if (where === game.raid.battle) {
			goto_raid_events();
		} else {
			set_active_enemy();
			game.state = 'militia_against_raid';
			game.count = 1;
		}
	} else {
		goto_raid_events();
	}
}

states.militia_against_raid = {
	prompt() {
		view.prompt = `You may deploy one militia against the raid at ${space_name(game.raid.where)}.`;
		view.where = game.raid.where;
		if (game.count > 0) {
			let box = department_militia(game.raid.where);
			if (game.active === FRANCE) {
				for (let p = first_french_militia; p <= last_french_militia; ++p)
					if (piece_node(p) === box)
						gen_action_piece(p);
			} else {
				for (let p = first_british_militia; p <= last_british_militia; ++p)
					if (piece_node(p) === box)
						gen_action_piece(p);
			}
		}
		gen_action_next();
	},
	piece(p) {
		push_undo();
		move_piece_to(p, game.raid.where);
		log(`Deployed ${piece_name(p)}.`);
		game.count --;
	},
	next() {
		clear_undo();
		set_active_enemy();
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
		set_active_enemy();
		game.state = 'raid_blockhouses';
	} else {
		resolve_raid();
	}
}

states.raid_blockhouses = {
	prompt() {
		if (player.hand.includes(BLOCKHOUSES)) {
			view.prompt = `Raid at ${space_name(game.raid.where)}. You may play "Blockhouses".`;
			gen_action('play_event', BLOCKHOUSES);
		} else {
			view.prompt = `Raid at ${space_name(game.raid.where)}. You don't have "Blockhouses".`;
		}
		gen_action_pass();
	},
	play_event(c) {
		play_card(c);
		game.events.blockhouses = game.active;
		set_active_enemy();
		resolve_raid();
	},
	pass() {
		set_active_enemy();
		resolve_raid();
	}
}

function resolve_raid() {
	let where = game.raid.where;
	let x_stockade = has_enemy_stockade(where);
	let x_allied = has_enemy_allied_settlement(where);

	let natural_die = roll_die("for raid");
	let die = natural_die;

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

	log(`Lookup ${die} vs ${column}.`);
	if (success) {
		if (losses === 0)
			log(`Success.`);
		else
			log(`Success with one step loss.`);
		if (x_stockade || x_allied || !has_friendly_raided_marker(where))
			place_friendly_raided_marker(where);
		if (x_stockade)
			destroy_enemy_stockade_in_raid(where);
		if (x_allied)
			eliminate_indian_tribe(where);
	} else {
		if (losses === 0)
			log(`No effect.`);
		else if (losses === 1)
			log(`Failure with one step loss.`);
		else
			log(`Failure with two step losses.`);
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

// RAIDERS GO HOME & INDIANS AND LEADERS GO HOME

function can_follow_indians_home(from) {
	for (let p = first_friendly_leader; p <= last_friendly_leader; ++p) {
		if (is_piece_unbesieged_in_space(p, from))
			return true;
	}
	for (let p = first_friendly_unit; p <= last_friendly_unit; ++p) {
		if (is_coureurs(p) && is_piece_unbesieged_in_space(p, from))
			return true;
	}
	return false;
}

function goto_raiders_go_home() {
	// Surviving raiders must go home!
	if (has_friendly_pieces(game.raid.where)) {
		game.state = 'raiders_go_home';
		game.go_home = {
			reason: 'raid',
			who: 0,
			from: 0,
			to: 0,
			follow: {},
		};
		init_go_home_summary();
	} else {
		end_raiders_go_home();
	}
}

function end_raiders_go_home() {
	flush_go_home_summary();
	delete game.go_home;
	goto_pick_raid();
}

function goto_indians_and_leaders_go_home() {
	set_active(FRANCE);
	resume_indians_and_leaders_go_home();
}

function resume_indians_and_leaders_go_home() {
	game.state = 'indians_and_leaders_go_home';
	game.go_home = {
		reason: 'late_season',
		who: 0,
		from: 0,
		to: 0,
		follow: {},
	};
	init_go_home_summary();
}

function end_indians_and_leaders_go_home() {
	flush_go_home_summary();
	logbr();
	clear_undo();
	if (game.active === FRANCE) {
		set_active(BRITAIN);
		resume_indians_and_leaders_go_home();
	} else {
		set_active(FRANCE);
		delete game.go_home;
		goto_remove_raided_markers();
	}
}

states.raiders_go_home = {
	prompt() {
		let from = game.raid.where;
		let done = true;
		if (true) {
			// INDIANS FIRST
			for_each_friendly_unit_in_space(from, p => {
				if (is_indian(p)) {
					done = false;
					gen_action_piece(p);
				}
			});
			if (done) {
				for_each_friendly_piece_in_space(from, p => {
					if (!is_indian(p)) {
						done = false;
						gen_action_piece(p);
					}
				});
			}
		} else {
			// IN ANY ORDER
			// Possibly confusing because leaders and coureurs can
			// only follow indians when indians lead the way.
			for_each_friendly_piece_in_space(from, p => {
				done = false;
				gen_action_piece(p);
			});
		}
		if (done) {
			view.prompt = `Raiders go home from ${space_name(from)} \u2014 done.`;
			gen_action_next();
		} else {
			view.prompt = `Raiders go home from ${space_name(from)}.`;
		}
	},
	piece(p) {
		push_undo();
		game.go_home.who = p;
		game.go_home.from = game.raid.where;
		game.state = 'go_home_to';
	},
	next() {
		end_raiders_go_home();
	},
}

states.indians_and_leaders_go_home = {
	prompt() {
		let done = true;
		for (let p = first_friendly_piece; p <= last_friendly_piece; ++p) {
			let s = piece_space(p);
			if (s && is_piece_unbesieged(p) && !has_friendly_fortifications(s)) {

				// Indians not at their settlement
				if (is_indian(p)) {
					if (s !== indians.space_from_piece[p]) {
						done = false;
						gen_action_piece(p);
					}
				}

				// Leaders who are left alone in the wilderness
				if (is_leader(p)) {
					if (is_wilderness_or_mountain(s) && !has_friendly_units(s)) {
						done = false;
						gen_action_piece(p);
					}
				}
			}
		}
		if (done) {
			view.prompt = "Indians and leaders go home \u2014 done.";
			gen_action_next();
		} else {
			view.prompt = "Indians and leaders go home.";
		}
	},
	piece(p) {
		push_undo();
		game.go_home.who = p;
		game.go_home.from = piece_space(p);
		game.state = 'go_home_to';
	},
	next() {
		end_indians_and_leaders_go_home();
	},
}

states.go_home_to = {
	prompt() {
		let who = game.go_home.who;
		let from = game.go_home.from;

		if (game.go_home.reason === 'late_season')
			view.prompt = `Indians and leaders go home \u2014 ${piece_name_and_place(who)}.`;
		else
			view.prompt = `Raiders go home \u2014 ${piece_name_and_place(who)}.`;
		view.who = who;

		let can_go_home = false;

		if (is_indian(who)) {
			let home = indians.space_from_piece[who];
			// 10.412: Cherokee have no home settlement
			if (home && has_friendly_allied_settlement(home) && !has_enemy_units(home)) {
				can_go_home = true;
				gen_action_space(home);
			}

			if (has_unbesieged_friendly_leader(from)) {
				can_go_home = true;
				find_closest_friendly_unbesieged_fortification(from).forEach(to => {
					can_go_home = true;
					gen_action_space(to);
				});
			} else if (game.go_home.follow && game.go_home.follow[from]) {
				can_go_home = true;
				game.go_home.follow[from].forEach(gen_action_space);
			}
		} else {
			// Leader alone in the wilderness; or leaders, rangers, and coureurs after raid.
			find_closest_friendly_unbesieged_fortification(from).forEach(to => {
				can_go_home = true;
				gen_action_space(to);
			});
		}

		if (!can_go_home)
			gen_action('eliminate');
	},
	space(to) {
		let who = game.go_home.who;
		let from = game.go_home.from;
		push_go_home_summary(who, to);
		move_piece_to(who, to);
		if (is_indian(who)) {
			let home = indians.space_from_piece[who];
			game.count = 0;
			if (to !== home) {
				if (game.go_home.follow[from]) {
					if (game.go_home.follow[from].includes(to)) {
						game.count = 0;
					} else {
						game.go_home.follow[from].push(to);
						game.count = 1;
					}
				} else {
					game.go_home.follow[from] = [ to ];
					game.count = 1;
				}
			}
			if (game.count > 0 || can_follow_indians_home(from)) {
				game.go_home.to = to;
				game.state = 'go_home_with_indians';
			} else {
				end_go_home_to();
			}
		} else {
			// Leader alone in the wilderness; or leaders, rangers and coureurs.
			if (is_leader(who)) {
				if (game.go_home.follow[from]) {
					if (!game.go_home.follow[from].includes(to))
						game.go_home.follow[from].push(to);
				} else {
					game.go_home.follow[from] = [ to ];
				}
			}
			end_go_home_to();
		}
	},
	eliminate() {
		eliminate_piece(game.go_home.who);
		end_go_home_to();
	},
}

states.go_home_with_indians = {
	prompt() {
		let from = game.go_home.from;
		let to = game.go_home.to;

		if (game.go_home.reason === 'late_season')
			view.prompt = "Indians and leaders go home \u2014 ";
		else
			view.prompt = "Raiders go home \u2014 ";
		if (game.active === FRANCE)
			view.prompt += "leaders and coureurs may follow to ";
		else
			view.prompt += "leaders may follow to ";
		view.prompt += space_name(to) + ".";
		view.where = to;

		for (let p = first_friendly_leader; p <= last_friendly_leader; ++p) {
			if (is_piece_unbesieged_in_space(p, from))
				gen_action_piece(p);
		}
		for (let p = first_friendly_unit; p <= last_friendly_unit; ++p) {
			if (is_coureurs(p) && is_piece_unbesieged_in_space(p, from))
				gen_action_piece(p);
		}

		if (game.count === 0)
			gen_action_next();
	},
	piece(p) {
		push_undo();
		let from = game.go_home.from;
		let to = game.go_home.to;

		push_go_home_summary(p, to);
		move_piece_to(p, to);
		if (game.count > 0 && is_leader(p))
			game.count = 0;

		if (!can_follow_indians_home(from))
			end_go_home_to();
	},
	next() {
		push_undo();
		end_go_home_to();
	},
}

function end_go_home_to() {
	game.go_home.who = 0;
	game.go_home.from = 0;
	game.go_home.to = 0;
	if (game.go_home.reason === 'late_season')
		game.state = 'indians_and_leaders_go_home';
	else
		game.state = 'raiders_go_home';
}

// LATE SEASON - REMOVE RAIDED MARKERS

function goto_remove_raided_markers() {
	if (game.french.raids.length > 0) {
		logbr();
		log(`France removed ${game.french.raids.length} raided markers.`);
		award_french_vp(Math.ceil(game.french.raids.length / 2));
		game.french.raids = [];
	}

	if (game.british.raids.length > 0) {
		logbr();
		log(`Britain removed ${game.british.raids.length} raided markers.`);
		award_british_vp(Math.ceil(game.british.raids.length / 2));
		game.british.raids = [];
	}

	goto_winter_attrition();
}

// LATE SEASON - WINTER ATTRITION

function goto_winter_attrition() {
	set_active(FRANCE);
	game.state = 'winter_attrition';
	logbr();
	log(".h3 French Winter Attrition")
	logbr();
	resume_winter_attrition();
}

function resume_winter_attrition() {
	let done = true;
	game.winter_attrition = {};
	for (let s = first_space; s <= last_space; ++s) {
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
	flush_summary();
	if (game.active === FRANCE) {
		set_active(BRITAIN);
		logbr();
		log(".h3 British Winter Attrition")
		logbr();
		resume_winter_attrition();
	} else {
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
			view.prompt = "Winter Attrition: Reduce drilled troops not in winter quarters.";
		}
	},
	piece(p) {
		let stack = game.winter_attrition[piece_space(p)];
		push_undo();
		if (is_unit_reduced(p))
			stack.n--;
		reduce_unit(p, true);
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

function is_enemy_controlled_fortress_for_vp(s) {
	// NOTE: active must be FRANCE
	if (has_unbesieged_friendly_units(s)) {
		if (is_space_besieged(s)) {
			// 13.12 British control unless besieging force qualifies to roll on siege table
			let cmd = find_friendly_commanding_leader_in_space(s);
			if (cmd && has_friendly_supplied_drilled_troops(s))
				return false;
			return true;
		}
		return false;
	}
	return true;
}

function are_all_enemy_controlled_fortresses_for_vp(list) {
	let result = true;
	for (let i = 0; i < list.length; ++i) {
		let s = list[i];
		if (!is_enemy_controlled_fortress_for_vp(s)) {
			result = false;
		}
	}
	return result;
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
	set_active(FRANCE);

	if (are_all_british_controlled_spaces(fortresses) && are_all_british_controlled_spaces([NIAGARA, OHIO_FORKS]))
		return goto_game_over(BRITAIN, "Sudden Death: The British control all fortresses, Niagara, and Ohio Forks.");
	if (game.vp >= 11)
		return goto_game_over(FRANCE, "Sudden Death: France has 11 or more VP.");
	if (game.vp <= -11)
		return goto_game_over(BRITAIN, "Sudden Death: Britain has 11 or more VP.");
	if (game.year === 1760 && game.vp >= 8)
		return goto_game_over(FRANCE, "Sudden Death: France has 8 or more VP in 1760.");
	if (game.year === 1761 && game.vp >= 8)
		return goto_game_over(FRANCE, "Sudden Death: France has 5 or more VP in 1761.");
	if (game.year === game.end_year) {
		if (game.year === 1759) {
			// NOTE: active is FRANCE
			if (are_all_enemy_controlled_fortresses_for_vp(originally_british_fortresses) &&
				count_british_controlled_spaces([QUEBEC, MONTREAL, NIAGARA, OHIO_FORKS]) >= 2)
				return goto_game_over(BRITAIN, "British Victory: Britain controls all its fortresses and two of Québec, Montréal, Niagara, and Ohio Forks.");
			if (game.vp >= 1)
				return goto_game_over(FRANCE, "French Victory: France has at least 1 VP.");
			if (game.vp <= -1)
				return goto_game_over(BRITAIN, "British Victory: Britain has at least 1 VP.");
		}
		if (game.year === 1762) {
			if (game.vp >= 1)
				return goto_game_over(FRANCE, "French Victory: France has at least 1 VP.");
			if (game.vp <= -5)
				return goto_game_over(BRITAIN, "British Victory: Britain has at least 5 VP.");
		}
		return goto_game_over(FRANCE, "The game is a draw.");
	} else {
		game.year++;
		start_year();
	}
}

function goto_game_over(result, victory) {
	logbr();
	log(victory);
	game.state = 'game_over';
	game.active = 'None';
	game.result = result;
	game.victory = victory;
}

states.game_over = {
	inactive() {
		view.prompt = game.victory;
	},
	prompt() {
		view.prompt = game.victory;
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
			log(`Demolished fort U/C at\n${space_name(s)}.`);
			// log(`Fort U/C (${space_name(s)}) demolished.`);
			// log(`Fort U/C at ${space_name(s)} demolished.`);
			remove_friendly_fort_uc(s);
		} else if (has_friendly_fort(s)) {
			log(`Demolished fort at\n${space_name(s)}.`);
			// log(`Fort (${space_name(s)}) demolished.`);
			// log(`Fort at ${space_name(s)} demolished.`);
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
		log(`Demolished stockade at\n${space_name(s)}.`);
		// log(`Stockade (${space_name(s)}) demolished.`);
		// log(`Stockade at ${space_name(s)} demolished.`);
		// log(`Demolished stockade (${space_name(s)}).`);
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
		return " \u2014 done";
	return ": " + n + " left";
}

function goto_construct_stockades(card) {
	push_undo();
	discard_card(card, "to construct stockades");
	player.did_construct = 1;
	game.state = 'construct_stockades';
	game.count = cards[card].activation;
}

states.construct_stockades = {
	prompt() {
		view.prompt = `Construct Stockades${format_remain(game.count)}.`;
		gen_action_next();
		if (game.count > 0) {
			for (let s = first_space; s <= last_space; ++s) {
				if (has_friendly_supplied_drilled_troops(s) || is_originally_friendly(s)) {
					if (has_enemy_units(s))
						continue;
					if (has_enemy_fortifications(s))
						continue;
					if (has_friendly_fortifications(s))
						continue;
					if (is_space_besieged(s))
						continue;
					if (is_fortress(s))
						continue;
					gen_action_space(s);
				}
			}
		}
	},
	space(s) {
		push_undo();
		log(`Stockade at ${space_name(s)}.`);
		// log(`Constructed stockade at ${space_name(s)}.`);
		// log(`Stockade at ${space_name(s)} constructed.`);
		player.stockades.push(s);
		game.count --;
	},
	next() {
		end_action_phase();
	},
}

function goto_construct_forts(card) {
	push_undo();
	discard_card(card, "to construct forts");
	player.did_construct = 1;
	game.state = 'construct_forts';
	game.count = cards[card].activation;
	game.list = [];
}

states.construct_forts = {
	prompt() {
		view.prompt = `Construct Forts${format_remain(game.count)}.`;
		gen_action_next();
		if (game.count > 0) {
			for (let s = first_space; s <= last_space; ++s) {
				if (has_friendly_supplied_drilled_troops(s)) {
					if (game.list.includes(s))
						continue;
					if (has_friendly_fort(s))
						continue;
					if (is_space_besieged(s))
						continue;
					if (is_fortress(s))
						continue;
					gen_action_space(s);
				}
			}
		}
	},
	space(s) {
		push_undo();
		if (has_friendly_fort_uc(s)) {
			// log(`Finished building fort at ${space_name(s)}.`);
			// log(`Fort (${space_name(s)}) built.`);
			log(`Fort at ${space_name(s)}.`);
			place_friendly_fort(s);
		} else {
			// log(`Started building fort at ${space_name(s)}.`);
			// log(`Fort U/C (${space_name(s)}) built.`);
			log(`Fort U/C at ${space_name(s)}.`);
			place_friendly_fort_uc(s);
			game.list.push(s); // don't finish it in the same action phase
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
			view.prompt = `Remove a 7 command leader from play \u2014 done.`;
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

function goto_massacre(reason) {
	clear_undo();
	set_active_enemy();
	game.state = 'massacre_1';
	game.massacre = reason;
}

function end_massacre() {
	let reason = game.massacre;
	delete game.massacre;
	set_active_enemy();
	switch (reason) {
	case 'move':
		resume_move();
		break;
	case 'assault':
		end_move_step(true);
		break;
	case 'surrender':
		goto_surrender_place();
		break;
	}
}

states.massacre_1 = {
	inactive: "massacre",
	prompt() {
		if (player.hand.includes(MASSACRE)) {
			view.prompt = `You may play "Massacre!"`;
			gen_action('play_event', MASSACRE);
		} else {
			view.prompt = `You don't have "Massacre!"`;
		}
		gen_action_pass();
	},
	play_event(c) {
		play_card(c);
		award_vp(1);
		game.state = 'massacre_2';
		set_active_enemy();
		unstack_force(moving_piece());
	},
	pass() {
		end_massacre();
	}
}

states.massacre_2 = {
	inactive: "massacre",
	prompt() {
		let s = moving_piece_space();
		let done = true;
		for (let p = 1; p <= last_piece; ++p) {
			if (is_indian(p) && is_piece_in_space(p, s)) {
				gen_action_piece(p);
				done = false;
			}
		}
		if (done) {
			view.prompt = `Massacre! Eliminate all indians in ${space_name(s)} \u2014 done.`;
			gen_action_next();
		} else {
			view.prompt = `Massacre! Eliminate all indians in ${space_name(s)}.`;
		}
	},
	piece(p) {
		eliminate_piece(p, false);
	},
	next() {
		set_active_enemy();
		end_massacre();
	}
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
		if (is_militia(p))
			return true; // always in militia box
		if (is_drilled_troops(p))
			return is_in_supply(piece_space(p));
		return true;
	}
	return false;
}

function count_french_raids_in_southern_department() {
	let n = 0;
	for (let i = 0; i < game.french.raids.length; ++i) {
		if (is_southern_department(game.french.raids[i]))
			++n;
	}
	return n;
}

function count_french_raids_in_northern_department() {
	let n = 0;
	for (let i = 0; i < game.french.raids.length; ++i) {
		if (is_northern_department(game.french.raids[i]))
			++n;
	}
	return n;
}

events.provincial_regiments_dispersed_for_frontier_duty = {
	can_play() {
		let s = Math.min(count_french_raids_in_southern_department(), count_southern_provincials());
		let n = Math.min(count_french_raids_in_northern_department(), count_northern_provincials());
		return (s + n) > 0;
	},
	play() {
		game.state = 'provincial_regiments_dispersed_for_frontier_duty';
		game.frontier_duty = {
			southern: Math.min(count_french_raids_in_southern_department(), count_southern_provincials()),
			northern: Math.min(count_french_raids_in_northern_department(), count_northern_provincials()),
		};
	}
}

states.provincial_regiments_dispersed_for_frontier_duty = {
	prompt() {
		let done = true;
		for (let p = first_british_unit; p <= last_british_unit; ++p) {
			if ((game.frontier_duty.northern > 0 && is_northern_provincial(p)) ||
				(game.frontier_duty.southern > 0 && is_southern_provincial(p))) {
				done = false;
				gen_action_piece(p);
			}
		}
		if (done) {
			view.prompt = `Provincial Regiments Dispersed \u2014 done.`;
		} else {
			view.prompt = `Provincial Regiments Dispersed: Eliminate ${game.frontier_duty.southern} southern and ${game.frontier_duty.northern} northern provincials.`;
			gen_action_next();
		}
	},
	piece(p) {
		push_undo();
		if (is_southern_provincial(p))
			game.frontier_duty.southern --;
		if (is_northern_provincial(p))
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
		if (game.vp > 4)
			game.count = roll;
		else
			game.count = Math.ceil(roll / 2);
		if (has_friendly_fort(NIAGARA))
			game.alliance = [ 'blue', 'blue-orange' ];
		else
			game.alliance = [ 'blue' ];
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
		if (game.vp > 4)
			game.count = roll;
		else
			game.count = Math.ceil(roll / 2);
		if (has_friendly_fort(NIAGARA))
			game.alliance = [ 'orange', 'blue-orange' ];
		else
			game.alliance = [ 'orange' ];
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
		game.count = roll;
		game.alliance = [ 'gray' ];
		game.state = 'indian_alliance';
	},
}

function find_friendly_unused_indian(s) {
	for (let p of indians.pieces_from_space[s])
		if (is_friendly_indian(p) && is_piece_unused(p))
			return p;
	return 0;
}

states.indian_alliance = {
	prompt() {
		let done = true;
		for (let a of game.alliance) {
			if (game.count >= 1) {
				for (let p of indians.pieces_from_color[a]) {
					if (is_friendly_indian(p) && is_piece_unused(p)) {
						let s = indians.space_from_piece[p];
						if (!has_enemy_allied_settlement(s) && can_place_in_space(s)) {
							done = false;
							gen_action_space(s);
						}
					}
				}
			}
			if (game.count >= 0.5) {
				for (let p of indians.pieces_from_color[a]) {
					if (is_friendly_indian(p) && can_restore_unit(p)) {
						done = false;
						gen_action_piece(p);
					}
				}
			}
		}
		if (done) {
			view.prompt = `Indian Alliance \u2014 done.`;
			gen_action_next();
		} else {
			view.prompt = `Indian Alliance: Place or restore ${game.alliance.join(" or ")} indians (${game.count} left).`;
		}
	},
	space(s) {
		push_undo();
		let p = find_friendly_unused_indian(s);
		if (p) {
			place_piece(p, s);
			game.count -= 1.0;
			if (has_unbesieged_enemy_leader(s) && !has_unbesieged_enemy_units(s))
				goto_retreat_lone_leader(s, 'indian_alliance');
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
function place_indian(s, first, last) {
	push_undo();
	for (let p = first; p <= last; ++p) {
		if (is_piece_unused(p)) {
			place_piece(p, s);
		}
	}
	game.count = 0;
}

function can_place_indians(first, last) {
	for (let p = first; p <= last; ++p)
		if (is_piece_unused(p))
			return true;
	return false;
}

function can_restore_unit_range(first, last) {
	for (let p = first; p <= last; ++p)
		if (can_restore_unit(p))
			return true;
	return false;
}

function can_place_or_restore_indians(first, last) {
	return can_place_indians(first, last) || can_restore_unit_range(first, last);
}

function goto_restore_units(name, first, last) {
	if (can_restore_unit_range(first, last)) {
		game.state = 'restore_units';
		game.restore = { name, first, last };
	} else {
		end_action_phase();
	}
}

states.restore_units = {
	prompt() {
		let done = true;
		for (let p = game.restore.first; p <= game.restore.last; ++p) {
			if (can_restore_unit(p)) {
				gen_action_piece(p);
				done = false;
			}
		}
		if (done) {
			view.prompt = `Restore all ${game.restore.name} \u2014 done.`;
			gen_action_next();
		} else {
			view.prompt = `Restore all ${game.restore.name}.`;
		}
	},
	piece(p) {
		restore_unit(p);
	},
	next() {
		end_action_phase();
	}
}

events.mohawks = {
	can_play() {
		let s = piece_space(JOHNSON);
		if (within_two_of_canajoharie.includes(s))
			if (is_piece_unbesieged(JOHNSON))
				return true;
		return can_place_or_restore_indians(first_mohawk, last_mohawk);
	},
	play() {
		if (can_place_indians(first_mohawk, last_mohawk)) {
			game.state = 'mohawks';
			game.count = 1;
		} else {
			goto_restore_units("Mohawks", first_mohawk, last_mohawk);
		}
	},
}

states.mohawks = {
	prompt() {
		let done = true;
		if (game.count > 0) {
			let s = piece_space(JOHNSON);
			if (can_place_in_space(s)) {
				done = false;
				gen_action_space(s);
			}
		}
		if (done) {
			view.prompt = "Place all Mohawks not on the map with Johnson \u2014 done.";
			gen_action_next();
		} else {
			view.prompt = "Place all Mohawks not on the map with Johnson.";
		}
	},
	space(s) {
		place_indian(s, first_mohawk, last_mohawk);
	},
	next() {
		goto_restore_units("Mohawks", first_mohawk, last_mohawk);
	},
}

events.cherokees = {
	can_play() {
		if (game.events.cherokee_uprising)
			return false;
		return can_place_or_restore_indians(first_cherokee, last_cherokee);
	},
	play() {
		game.events.cherokees = 1;
		if (can_place_indians(first_cherokee, last_cherokee)) {
			game.state = 'cherokees';
			game.count = 1;
		} else {
			goto_restore_units("Cherokees", first_cherokee, last_cherokee);
		}

	},
}

states.cherokees = {
	prompt() {
		let done = true;
		if (game.count > 0) {
			for (let s = first_southern_department; s <= last_southern_department; ++s) {
				if (has_unbesieged_friendly_fortifications(s)) {
					done = false;
					gen_action_space(s);
				}
			}
		}
		if (done) {
			view.prompt = "Place all Cherokees not on the map at a British fortification in the southern dept \u2014 done.";
			gen_action_next();
		} else {
			view.prompt = "Place all Cherokees not on the map at a British fortification in the southern dept.";
		}
	},
	space(s) {
		place_indian(s, first_cherokee, last_cherokee);
	},
	next() {
		goto_restore_units("Cherokees", first_cherokee, last_cherokee);
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
		set_active_enemy();
		game.state = 'cherokee_uprising';
		game.uprising = {
			regular: 2,
			southern: 1
		}
	},
}

states.cherokee_uprising = {
	prompt() {
		let done = true;
		for (let p = first_british_unit; p <= last_british_unit; ++p) {
			if (is_piece_on_map(p) && is_piece_unbesieged(p)) {
				let x = false;
				if (game.uprising.regular > 0 && is_regular(p))
					x = true;
				if (game.uprising.southern > 0 && is_southern_provincial(p))
					x = true;
				if (is_cherokee(p))
					x = true;
				if (x) {
					done = false;
					gen_action_piece(p);
				}
			}
		}
		if (done) {
			view.prompt = `Cherokee Uprising \u2014 done.`;
			gen_action_next();
		} else {
			view.prompt = `Cherokee Uprising: Eliminate ${game.uprising.regular} regulars, ${game.uprising.southern} southern provincials, and all Cherokee.`;
		}
	},
	piece(p) {
		push_undo();
		if (is_regular(p))
			game.uprising.regular --;
		if (is_southern_provincial(p))
			game.uprising.southern --;
		eliminate_piece(p);
	},
	next() {
		delete game.uprising;
		set_active_enemy();
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
		clear_undo();
		set_active_enemy();
		game.state = 'treaty_of_easton';
	},
}

states.treaty_of_easton = {
	prompt() {
		let done = true;
		for (let p = first_orange_indian; p <= last_orange_indian; ++p) {
			if (is_piece_on_map(p) && is_piece_unbesieged(p)) {
				gen_action_piece(p);
				done = false;
			}
		}
		if (done) {
			view.prompt = "Treaty of Easton: Eliminate all unbesieged orange indians \u2014 done.";
			gen_action_next();
		} else {
			view.prompt = "Treaty of Easton: Eliminate all unbesieged orange indians.";
		}
	},
	piece(p) {
		eliminate_piece(p);
	},
	next() {
		set_active_enemy();
		end_action_phase();
	}
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
				if (is_indian(p) && is_piece_on_map(p) && is_piece_unbesieged(p)) {
					if (!game.indians_desert || is_piece_in_space(p, game.indians_desert)) {
						can_desert = true;
						gen_action_piece(p);
					}
				}
			}
		}
		if (can_desert) {
			view.prompt = `Indians Desert: Eliminate two indians from one space (${game.count} left).`;
		} else {
			view.prompt = "Indians Desert: Eliminate two indians from one space \u2014 done.";
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
		let roll = roll_die()
		log("No amphibious landings this year.");
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
		game.count = 1;
		game.swap = 0;
	},
}

states.governor_vaudreuil_interferes = {
	inactive: "governor Vaudreuil interferes",
	prompt() {
		if (game.count > 0) {
			if (game.swap) {
				view.prompt = `Governor Vaudreuil Interferes: Reverse location of ${piece_name(game.swap)} and another French leader.`;
				view.who = game.swap;
			} else {
				view.prompt = "Governor Vaudreuil Interferes: Reverse location of two French leaders.";
			}
			for (let p = first_enemy_leader; p <= last_enemy_leader; ++p) {
				if (is_piece_unbesieged(p))
					if (!game.events.no_fr_naval || piece_space(p) !== LOUISBOURG)
						if (p !== game.swap)
							gen_action_piece(p);
			}
		} else {
			view.prompt = "Governor Vaudreuil Interferes \u2014 done.";
			gen_action_next();
		}
	},
	piece(p) {
		if (game.swap) {
			push_undo();
			let a = game.swap;
			delete game.swap;
			let a_loc = piece_space(a);
			let p_loc = piece_space(p);
			move_piece_to(a, p_loc);
			move_piece_to(p, a_loc);
			log(`${piece_name(a)} moved to ${space_name(p_loc)}.`);
			log(`${piece_name(p)} moved to ${space_name(a_loc)}.`);
			game.count = 0;
		} else {
			push_undo();
			game.swap = p;
		}
	},
	next() {
		end_action_phase();
	}
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
		view.prompt = "Small Pox: Choose a space with more than 4 units.";
		for (let s = first_space; s <= last_space; ++s)
			if (count_enemy_units_in_space(s) > 4)
				gen_action_space(s);
	},
	space(s) {
		clear_undo(); // rolling die
		log(`Small Pox at ${space_name(s)}.`);
		let roll = roll_die();
		if (count_enemy_units_in_space(s) > 8) {
			game.count = roll;
		} else {
			game.count = Math.ceil(roll / 2);
		}
		log(`Must eliminate ${game.count} steps.`);
		clear_undo();
		game.state = 'small_pox_eliminate_steps';
		game.small_pox = s;
		set_active_enemy();
	},
}

states.small_pox_eliminate_steps = {
	prompt() {
		let done = true;
		if (game.count > 0) {
			for_each_friendly_unit_in_space(game.small_pox, p => {
				if (!is_unit_reduced(p)) {
					done = false;
					gen_action_piece(p);
				}
			});
			if (done) {
				for_each_friendly_unit_in_space(game.small_pox, p => {
					if (is_unit_reduced(p)) {
						done = false;
						gen_action_piece(p);
					}
				});
			}
		}
		if (done) {
			view.prompt = `Small Pox at ${space_name(game.small_pox)} \u2014 done.`;
			gen_action_next();
		} else {
			view.prompt = `Small Pox at ${space_name(game.small_pox)}: Eliminate steps \u2014 ${game.count} left.`;
		}
	},
	piece(p) {
		push_undo();
		game.count --;
		reduce_unit(p, false);
	},
	next() {
		if (has_friendly_indians(game.small_pox)) {
			clear_undo();
			game.state = 'small_pox_remove_indians';
		} else {
			end_small_pox();
		}
	},
}

states.small_pox_remove_indians = {
	prompt() {
		view.prompt = `Small Pox at ${space_name(game.small_pox)}: Remove all indians.`;
		for_each_friendly_unit_in_space(game.small_pox, p => {
			if (is_indian(p))
				gen_action_piece(p);
		});
	},
	piece(p) {
		eliminate_piece(p, false);
		if (!has_friendly_indians(game.small_pox))
			end_small_pox();
	},
}

function end_small_pox() {
	delete game.small_pox;
	set_active_enemy();
	end_action_phase();
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
			log(`Stole ${card_name(c)}.`);
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
		game.discard.push(c);
		log(`France discarded ${card_name(c)}.`);
		end_action_phase();
	},
}

const british_ministerial_crisis_cards = [ 47, 48, 54, 57, 58, 59, 60, 61, 63, 64 ];

events.british_ministerial_crisis = {
	can_play() {
		return enemy_player.hand.length > 0;
	},
	play() {
		clear_undo();
		let n = 0;
		for (let i = 0; i < enemy_player.hand.length; ++i) {
			let c = enemy_player.hand[i];
			if (british_ministerial_crisis_cards.includes(c))
				++n;
		}
		if (n > 0) {
			set_active_enemy();
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
		if (game.count > 0) {
			view.prompt = "British Ministerial Crisis: Discard a British Regulars, Highlanders, Light Infantry, Transports, or Victories card.";
			for (let i = 0; i < player.hand.length; ++i) {
				let c = player.hand[i];
				if (british_ministerial_crisis_cards.includes(c))
					gen_action_discard(c);
			}
		} else {
			view.prompt = "British Ministerial Crisis \u2014 done.";
			gen_action_next();
		}
	},
	card(c) {
		push_undo();
		game.count = 0;
		discard_card(c);
	},
	next() {
		set_active_enemy();
		end_action_phase();
	}
}

function count_southern_provincials() {
	let n = 0;
	for (let p = first_southern_provincial; p <= last_southern_provincial; ++p)
		if (is_piece_on_map(p))
			++n;
	return n;
}

function count_northern_provincials() {
	let n = 0;
	for (let p = first_northern_provincial; p <= last_northern_provincial; ++p)
		if (is_piece_on_map(p))
			++n;
	return n;
}

function count_unbesieged_southern_provincials() {
	let n = 0;
	for (let p = first_southern_provincial; p <= last_southern_provincial; ++p)
		if (is_piece_on_map(p) && is_piece_unbesieged(p))
			++n;
	return n;
}

function count_unbesieged_northern_provincials() {
	let n = 0;
	for (let p = first_northern_provincial; p <= last_northern_provincial; ++p)
		if (is_piece_on_map(p) && is_piece_unbesieged(p))
			++n;
	return n;
}

function count_reduced_unbesieged_southern_provincials() {
	let n = 0;
	for (let p = first_southern_provincial; p <= last_southern_provincial; ++p)
		if (is_piece_on_map(p) && is_piece_unbesieged(p) && is_unit_reduced(p))
			++n;
	return n;
}

function count_reduced_unbesieged_northern_provincials() {
	let n = 0;
	for (let p = first_northern_provincial; p <= last_northern_provincial; ++p)
		if (is_piece_on_map(p) && is_piece_unbesieged(p) && is_unit_reduced(p))
			++n;
	return n;
}

events.stingy_provincial_assembly = {
	can_play() {
		if (game.pa === ENTHUSIASTIC)
			return false;
		let num_n = count_unbesieged_northern_provincials();
		let num_s = count_unbesieged_southern_provincials();
		return (num_n + num_s) > 0;
	},
	play() {
		let num_n = count_unbesieged_northern_provincials();
		let num_s = count_unbesieged_southern_provincials();
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
		view.prompt = "Stingy Provincial Assembly: Choose a department.";
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
	set_active_enemy();
	game.state = 'stingy_provincial_assembly';
	game.department = dept;
	game.count = 1;
}

states.stingy_provincial_assembly = {
	prompt() {
		if (game.count > 0) {
			view.prompt = `Stingy Provincial Assembly: Remove a ${game.department} provincial unit.`;
			if (game.department === 'northern') {
				for (let p = first_northern_provincial; p <= last_northern_provincial; ++p)
					if (is_piece_unbesieged(p))
						gen_action_piece(p);
			} else {
				for (let p = first_southern_provincial; p <= last_southern_provincial; ++p)
					if (is_piece_unbesieged(p))
						gen_action_piece(p);
			}
		} else {
			view.prompt = `Stingy Provincial Assembly \u2014 done.`;
			gen_action_next();
		}
	},
	piece(p) {
		push_undo();
		game.count = 0;
		eliminate_piece(p);
	},
	next() {
		set_active_enemy();
		end_action_phase();
	},
}

events.british_colonial_politics = {
	can_play() {
		if (game.active === FRANCE)
			return game.pa > 0;
		return game.pa < 2;
	},
	play() {
		if (game.active === FRANCE) {
			game.pa -= 1;
			log(`Provincial Assemblies reduced to ${pa_name()}.`);
			goto_british_colonial_politics();
		} else {
			game.pa += 1;
			log(`Provincial Assemblies increased to ${pa_name()}.`);
			end_action_phase();
		}
	},
}

function pa_name() {
	switch (game.pa) {
	case RELUCTANT: return "Reluctant";
	case SUPPORTIVE: return "Supportive";
	case ENTHUSIASTIC: return "Enthusiastic";
	}
}

const southern_provincial_limit = [ 2, 4, 6 ];
const northern_provincial_limit = [ 6, 10, 18 ];

function goto_british_colonial_politics() {
	if (game.pa < ENTHUSIASTIC) {
		let num_s = count_southern_provincials();
		let num_n = count_northern_provincials();
		let max_n = northern_provincial_limit[game.pa];
		let max_s = southern_provincial_limit[game.pa];
		if (num_s > max_s || num_n > max_n) {
			clear_undo();
			set_active_enemy();
			game.state = 'british_colonial_politics';
			return;
		}
	}
	end_action_phase();
}

states.british_colonial_politics = {
	prompt() {
		let num_s = count_southern_provincials();
		let num_n = count_northern_provincials();
		let max_n = northern_provincial_limit[game.pa];
		let max_s = southern_provincial_limit[game.pa];
		let done = true;
		if (num_s > max_s) {
			for (let p = first_southern_provincial; p <= last_southern_provincial; ++p) {
				if (is_piece_unbesieged(p)) {
					gen_action_piece(p);
					done = false;
				}
			}
		}
		if (num_n > max_n) {
			for (let p = first_northern_provincial; p <= last_northern_provincial; ++p) {
				if (is_piece_unbesieged(p)) {
					gen_action_piece(p);
					done = false;
				}
			}
		}
		if (done) {
			view.prompt = `British Colonial Politics \u2014 done.`;
			gen_action_next();
		} else {
			view.prompt = `British Colonial Politics: Remove provincials over limit \u2014 ${num_s}/${max_s} southern, ${num_n}/${max_n} northern.`;
		}
	},
	piece(p) {
		push_undo();
		eliminate_piece(p);
	},
	next() {
		set_active_enemy();
		end_action_phase();
	},
}

function can_raise_southern_provincial_regiments() {
	let num = count_southern_provincials();
	let max = southern_provincial_limit[game.pa];
	return num < max;
}

function can_raise_northern_provincial_regiments() {
	let num = count_northern_provincials();
	let max = northern_provincial_limit[game.pa];
	return num < max;
}

function can_restore_southern_provincial_regiments() {
	return count_reduced_unbesieged_southern_provincials() > 0;
}

function can_restore_northern_provincial_regiments() {
	return count_reduced_unbesieged_northern_provincials() > 0;
}

events.raise_provincial_regiments = {
	can_play() {
		if (game.pa === RELUCTANT)
			return false;
		if (can_raise_northern_provincial_regiments() || can_restore_northern_provincial_regiments())
			return true;
		if (can_raise_southern_provincial_regiments() || can_restore_southern_provincial_regiments())
			return true;
		return false;
	},
	play() {
		game.state = 'raise_provincial_regiments_where';
	},
}

states.raise_provincial_regiments_where = {
	prompt() {
		view.prompt = "Raise Provincial Regiments in which department?";
		if (can_raise_northern_provincial_regiments() || can_restore_northern_provincial_regiments())
			gen_action('northern');
		if (can_raise_southern_provincial_regiments() || can_restore_southern_provincial_regiments())
			gen_action('southern');
	},
	northern() {
		push_undo();
		let num = count_northern_provincials();
		let max = northern_provincial_limit[game.pa];
		game.state = 'raise_provincial_regiments';
		game.count = clamp(max - num, 0, 4);
		game.department = 'northern';
		game.did_raise = 0;
		if (game.count === 0)
			goto_restore_provincial_regiments();
	},
	southern() {
		push_undo();
		let num = count_southern_provincials();
		let max = southern_provincial_limit[game.pa];
		game.state = 'raise_provincial_regiments';
		game.count = clamp(max - num, 0, 2);
		game.department = 'southern';
		game.did_raise = 0;
		if (game.count === 0)
			goto_restore_provincial_regiments();
	},
}

states.raise_provincial_regiments = {
	prompt() {
		let done = true;
		if (!game.did_raise) {
			if (game.department === 'northern' && can_restore_northern_provincial_regiments()) {
				done = false;
				gen_action('restore');
			}
			if (game.department === 'southern' && can_restore_southern_provincial_regiments()) {
				done = false;
				gen_action('restore');
			}
		}
		if (game.count > 0) {
			if (game.department === 'northern') {
				for (let s = first_northern_department; s <= last_northern_department; ++s) {
					if (has_unbesieged_friendly_fortifications(s)) {
						done = false;
						gen_action_space(s);
					}
				}
			}
			if (game.department === 'southern') {
				for (let s = first_southern_department; s <= last_southern_department; ++s) {
					if (has_unbesieged_friendly_fortifications(s)) {
						done = false;
						gen_action_space(s);
					}
				}
			}
		}
		if (done) {
			view.prompt = `Raise Provincial Regiments \u2014 done.`;
			gen_action_next();
		} else {
			if (game.did_raise)
				view.prompt = `Raise Provincial Regiments in ${game.department} department (${game.count} left).`;
			else
				view.prompt = `Raise Provincial Regiments in ${game.department} department (${game.count} left) or restore all to full.`;
		}
	},
	restore() {
		push_undo();
		goto_restore_provincial_regiments();
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

function goto_restore_provincial_regiments() {
	game.count = 0;
	delete game.did_raise;
	if (game.department === 'northern') {
		delete game.department;
		goto_restore_units("Northern Provincials", first_northern_provincial, last_northern_provincial);
	} else {
		delete game.department;
		goto_restore_units("Southern Provincials", first_southern_provincial, last_southern_provincial);
	}
}

function is_card_removed(card) {
	return game.removed.includes(card);
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
		game.events.quiberon = 1;
		delete game.events.diplo;
		end_action_phase();
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
			view.prompt = "Bastions Repaired: Replace a siege 1 or siege 2 marker on the map with siege 0.";
			for_each_siege((space, level) => {
				if (level > 0 && is_friendly_siege(space))
					gen_action_space(space);
			});
		} else {
			view.prompt = "Bastions Repaired \u2014 done.";
			gen_action_next();
		}
	},
	space(s) {
		push_undo();
		log(`Replaced siege marker at ${space_name(s)} with siege 0.`);
		game.sieges[s] = 0;
		game.count = 0;
	},
	next() {
		end_action_phase();
	},
}

function is_colonial_recruit(p) {
	return is_coureurs(p) || is_ranger(p) || is_light_infantry(p) || is_provincial(p);
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
		let done = true;
		if (game.count > 0) {
			for (let p = first_friendly_unit; p <= last_friendly_unit; ++p) {
				if (is_colonial_recruit(p)) {
					if (can_restore_unit(p)) {
						done = false;
						gen_action_piece(p);
					}
				}
			}
		}
		if (done) {
			view.prompt = `Colonial Recruits \u2014 done.`;
			gen_action_next();
		} else {
			view.prompt = `Colonial Recruits: Restore ${game.count} reduced colonial recruits.`;
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
		if (is_regular(p) || is_light_infantry(p))
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
		clear_undo();
		game.state = 'restore_regular_or_light_infantry_units';
		game.count = roll_die();
	},
}

states.restore_regular_or_light_infantry_units = {
	prompt() {
		let done = true;
		if (game.count > 0) {
			for (let p = first_friendly_unit; p <= last_friendly_unit; ++p) {
				if (is_regular(p) || is_light_infantry(p)) {
					if (can_restore_unit(p)) {
						done = false;
						gen_action_piece(p);
					}
				}
			}
		}
		if (done) {
			view.prompt = `Restore reduced regular or light infantry \u2014 done.`;
			gen_action_next();
		} else {
			view.prompt = `Restore ${game.count} reduced regular or light infantry.`;
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

events.call_out_militias = {
	can_play() {
		if (game.active === FRANCE) {
			for (let p = first_french_militia; p <= last_french_militia; ++p)
				if (is_piece_unused(p) || is_unit_reduced(p))
					return true;
		} else {
			for (let p = first_british_militia; p <= last_british_militia; ++p)
				if (is_piece_unused(p) || is_unit_reduced(p))
					return true;
		}
		return false;
	},
	play() {
		game.state = 'call_out_militias';
		game.count = 2;
	}
}

states.call_out_militias = {
	prompt() {
		let done = true;
		if (game.count === 2) {
			if (game.active === BRITAIN) {
				if (find_unused_friendly_militia()) {
					done = false;
					gen_action_space(SOUTHERN_COLONIAL_MILITIAS);
					gen_action_space(NORTHERN_COLONIAL_MILITIAS);
				}
			} else {
				if (find_unused_friendly_militia()) {
					done = false;
					gen_action_space(ST_LAWRENCE_CANADIAN_MILITIAS);
				}
			}
		}
		if (game.count > 0) {
			if (game.active === BRITAIN) {
				for (let p = first_british_militia; p <= last_british_militia; ++p) {
					if (is_piece_on_map(p) && is_unit_reduced(p)) {
						done = false;
						gen_action_piece(p);
					}
				}
			} else {
				for (let p = first_french_militia; p <= last_french_militia; ++p) {
					if (is_piece_on_map(p) && is_unit_reduced(p)) {
						done = false;
						gen_action_piece(p);
					}
				}
			}
		}
		if (done) {
			view.prompt = `Call Out Militias \u2014 done.`;
			gen_action_next();
		} else {
			if (game.count < 2)
				view.prompt = `Call Out Militias: Restore another militia to full strength.`;
			else
				view.prompt = `Call Out Militias: Place one militia into a militia box, or restore 2 to full strength.`;
		}
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

events.rangers = {
	play() {
		game.state = 'rangers';
		game.count = 2;
	}
}

states.rangers = {
	prompt() {
		let done = true;
		if (game.count === 2) {
			if (find_unused_ranger()) {
				for (let s = first_space; s <= last_space; ++s) {
					if (has_unbesieged_friendly_fortifications(s)) {
						done = false;
						gen_action_space(s);
					}
						
				}
			}
		}
		if (game.count > 0) {
			for (let p = first_friendly_unit; p <= last_friendly_unit; ++p) {
				if (is_ranger(p)) {
					if (can_restore_unit(p)) {
						done = false;
						gen_action_piece(p);
					}
				}
			}
		}
		if (done) {
			view.prompt = `Rangers \u2014 done.`;
			gen_action_next();
		} else {
			if (game.count < 2)
				view.prompt = `Rangers: Restore another ranger to full strength.`;
			else
				view.prompt = `Rangers: Place a ranger at a fortification, or restore 2 to full strength.`;
		}
	},
	space(s) {
		push_undo();
		let p = find_unused_ranger();
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
		if (game.options.regulars_vp && game.year <= 1756)
			award_vp(-1);
	}
}

states.french_regulars = {
	prompt() {
		if (game.leader.length > 0) {
			let p = game.leader[0];
			view.prompt = `French Regulars: Place ${piece_name(p)} at either Québec or Louisbourg.`;
			view.who = p;
		} else {
			if (game.count > 0)
				view.prompt = `French Regulars: Place ${game.count} regulars at either Québec or Louisbourg.`;
			else
				view.prompt = `French Regulars \u2014 done.`;
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
			let p = find_unused_french_regular();
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
			view.prompt = `Light Infantry: Place ${piece_name(game.leader)} at any fortress.`;
			view.who = game.leader;
		} else {
			if (game.count > 0)
				view.prompt = `Light Infantry: Place ${game.count} light infantry at any fortresses.`;
			else
				view.prompt = `Light Infantry \u2014 done.`;
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
			let p = find_unused_light_infantry();
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

function can_place_in_british_ports() {
	for (let i = 0; i < ports.length; ++i)
		if (is_british_controlled_space(ports[i]))
			return true;
	return game.amphib.length > 0;
}

events.british_regulars = {
	can_play() {
		if (game.events.british_regulars)
			return false;
		return can_place_in_british_ports();
	},
	play() {
		clear_undo(); // drawing leader from pool
		game.state = 'british_regulars';
		game.count = 3;
		game.leader = draw_leader_from_pool();
		if (game.options.regulars_vp && game.year <= 1756)
			award_vp(-1);
	}
}

states.british_regulars = {
	prompt() {
		if (game.leader) {
			view.prompt = `British Regulars: Place ${piece_name(game.leader)} at any port.`;
			view.who = game.leader;
		} else {
			if (game.count > 0)
				view.prompt = `British Regulars: Place ${game.count} regulars at any ports.`;
			else
				view.prompt = `British Regulars \u2014 done.`;
		}
		if (game.count > 0) {
			for_each_british_controlled_port_and_amphib(s => {
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
			let p = find_unused_british_regular();
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

events.highlanders = {
	can_play() {
		if (game.events.pitt || game.year > 1758)
			return true;
		return can_place_in_british_ports();
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
			view.prompt = `Highlanders: Place ${piece_name(p)} at any port.`;
			view.who = p;
		} else {
			if (game.count > 0)
				view.prompt = `Highlanders: Place ${game.count} highlanders at any ports.`;
			else
				view.prompt = `Highlanders \u2014 done.`;
		}
		if (game.count > 0) {
			for_each_british_controlled_port_and_amphib(s => {
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
			let p = find_unused_highland();
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

events.royal_americans = {
	can_play() {
		for (let s = first_northern_department; s <= last_northern_department; ++s)
			if (has_unbesieged_friendly_fortress(s))
				return true;
		for (let s = first_southern_department; s <= last_southern_department; ++s)
			if (has_unbesieged_friendly_fortress(s))
				return true;
		return false;
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
			view.prompt = `Royal Americans: Place ${piece_name(p)} at any fortress in the departments.`;
			view.who = p;
		} else {
			if (game.count > 0)
				view.prompt = `Royal Americans: Place ${game.count} royal americans at any fortress in the departments.`;
			else
				view.prompt = `Royal Americans \u2014 done.`;
		}
		if (game.count > 0) {
			for (let s = first_northern_department; s <= last_northern_department; ++s)
				if (has_unbesieged_friendly_fortress(s))
					gen_action_space(s);
			for (let s = first_southern_department; s <= last_southern_department; ++s)
				if (has_unbesieged_friendly_fortress(s))
					gen_action_space(s);
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
			let p = find_unused_royal_american();
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

events.acadians_expelled = {
	can_play() {
		if (game.options.acadians)
			return true;
		return game.active === BRITAIN;
	},
	play() {
		game.state = 'acadians_expelled_place_regulars';
	},
}

states.acadians_expelled_place_regulars = {
	inactive: 'Acadians expelled (place regulars)',
	prompt() {
		view.prompt = "Acadians Expelled: Place two Regulars at Halifax.";
		gen_action_space(HALIFAX);
	},
	space() {
		for (let i = 0; i < 2; ++i) {
			let p = find_unused_british_regular();
			place_piece(p, HALIFAX);
		}
		clear_undo();
		game.acadians = game.active;
		set_active(FRANCE);
		game.state = 'acadians_expelled_place_coureurs';
	},
}

states.acadians_expelled_place_coureurs = {
	inactive: 'Acadians expelled (place coureurs)',
	prompt() {
		view.prompt = "Acadians Expelled: Place a Coureurs unit at Québec or Louisbourg.";
		if (!has_british_units(QUEBEC))
			gen_action_space(QUEBEC);
		if (!has_british_units(LOUISBOURG))
			gen_action_space(LOUISBOURG);
		if (has_british_units(QUEBEC) && has_british_units(LOUISBOURG))
			gen_action_pass();
	},
	space(s) {
		push_undo();
		let p = find_unused_coureurs();
		if (p)
			place_piece(p, s);
		game.state = 'acadians_expelled_restore_coureurs_and_militia';
	},
	pass() {
		set_active(game.acadians);
		delete game.acadians;
		end_action_phase();
	},
}

states.acadians_expelled_restore_coureurs_and_militia = {
	inactive: 'Acadians expelled (restore coureurs and militia)',
	prompt() {
		let done = true;
		for (let p = first_french_militia; p <= last_french_militia; ++p) {
			if (can_restore_unit(p)) {
				done = false;
				gen_action_piece(p);
			}
		}
		for (let p = first_coureurs; p <= last_coureurs; ++p) {
			if (can_restore_unit(p)) {
				done = false;
				gen_action_piece(p);
			}
		}
		if (done) {
			view.prompt = "Acadians Expelled: Restore all Coureurs and Militia \u2014 done.";
			gen_action_next();
		} else {
			view.prompt = "Acadians Expelled: Restore all Coureurs and Militia.";
		}
	},
	piece(p) {
		restore_unit(p);
	},
	next() {
		set_active(game.acadians);
		delete game.acadians;
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
		place_amherst_forbes_and_wolfe_in_pool();
	}
}

states.william_pitt = {
	prompt() {
		if (game.count > 0) {
			view.prompt = "William Pitt: Draw Highlanders, British Regulars, Light Infantry or Troop Transports from discard.";
			view.hand = game.discard;
			for (let c of game.discard) {
				if (william_pitt_cards.includes(cards[c].event))
					gen_action('card', c);
			}
		} else {
			view.prompt = "William Pitt \u2014 done.";
		}
		gen_action_next();
	},
	card(c) {
		push_undo();
		log(`Drew ${card_name(c)} from discard.`);
		remove_from_array(game.discard, c);
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
			view.prompt = "Diplomatic Revolution: Draw French Regulars or Troop Transports from discard.";
			view.hand = game.discard;
			for (let c of game.discard) {
				if (diplomatic_revolution_cards.includes(cards[c].event))
					gen_action('card', c);
			}
		} else {
			view.prompt = "Diplomatic Revolution \u2014 done.";
		}
		gen_action_next();
	},
	card(c) {
		push_undo();
		log(`Drew ${card_name(c)} from discard.`);
		remove_from_array(game.discard, c);
		player.hand.push(c);
		game.count = 0;
	},
	next() {
		end_action_phase();
	}
}

states.discard_to_draw_regulars = {
	prompt() {
		view.prompt = `Exchange random card with British Regulars or Highlanders from discard?`;
		gen_action('exchange');
		gen_action('pass');
	},
	exchange() {
		push_undo();
		game.state = 'draw_regulars';
	},
	pass() {
		start_action_phase();
	},
}

states.draw_regulars = {
	prompt() {
		view.prompt = `Draw one British Regulars or Highlanders from the discard.`;
		view.hand = game.discard;
		for (let c of game.discard) {
			if (cards[c].event === 'british_regulars' || cards[c].event === 'highlanders')
				gen_action('card', c);
		}
	},
	card(c) {
		clear_undo();

		let x = player.hand[random(player.hand.length)];
		remove_from_array(player.hand, x);
		game.discard.push(x);
		remove_from_array(game.discard, c);
		player.hand.push(c);

		log(`Exchanged ${card_name(x)} for ${card_name(c)} in discard.`);

		start_action_phase();
	},
}

events.intrigues_against_shirley = {
	can_play() {
		return game.vp >= 1 && is_piece_on_map(SHIRLEY) && is_piece_unbesieged(SHIRLEY);
	},
	play() {
		game.state = 'intrigues_against_shirley';
	}
}

states.intrigues_against_shirley = {
	prompt() {
		view.prompt = "Intrigues Against Shirley: Eliminate Shirley.";
		gen_action_piece(SHIRLEY);
	},
	piece() {
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
	who = find_unused_piece(who);
	where = find_space(where);
	game.location[who] = where;
}

function setup_unit(where, who) {
	who = find_unused_piece(who);
	where = find_space(where);
	game.location[who] = where;
}

function setup_1757(end_year, start_vp) {
	game.year = 1757;
	game.end_year = end_year;
	game.season = EARLY;
	game.vp = start_vp;
	game.pa = SUPPORTIVE;

	for (let i = 1; i <= 62; ++i)
		game.deck.push(i);
	for (let i = 63; i <= 70; ++i)
		game.removed.push(i);

	setup_markers(game.french.allied, [
		"Mingo Town",
		"Logstown",
		"Pays d'en Haut",
		"Mississauga",
	]);

	setup_markers(game.french.forts, [
		"Ticonderoga",
		"Crown Point",
		"Niagara",
		"Ohio Forks",
	]);

	setup_markers(game.french.stockades, [
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

	setup_markers(game.british.forts, [
		"Hudson Carry South",
		"Hudson Carry North",
		"Will's Creek",
		"Shamokin",
	]);

	setup_markers(game.british.forts_uc, [
		"Winchester",
		"Shepherd's Ferry",
	]);

	setup_markers(game.british.stockades, [
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

	game.british.pool.push(find_unused_piece("Amherst"));
	game.british.pool.push(find_unused_piece("Bradstreet"));
	game.british.pool.push(find_unused_piece("Forbes"));
	game.british.pool.push(find_unused_piece("Murray"));
	game.british.pool.push(find_unused_piece("Wolfe"));

	setup_leader("eliminated", "Braddock");
	setup_leader("eliminated", "Shirley");

	game.events.pitt = 1;
	game.events.diplo = 1;
}

function setup_1755() {
	game.year = 1755;
	game.season = EARLY;
	game.vp = 0;
	game.pa = SUPPORTIVE;

	for (let i = 1; i <= 70; ++i)
		game.deck.push(i);

	setup_markers(game.french.allied, [
		"Pays d'en Haut",
		"Kahnawake",
		"St-François",
	]);
	setup_markers(game.british.allied, [
		"Canajoharie",
	]);

	setup_markers(game.french.forts, [
		"Crown Point",
		"Niagara",
		"Ohio Forks",
	]);
	setup_markers(game.french.stockades, [
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

	setup_markers(game.british.forts, [
		"Hudson Carry South",
		"Will's Creek",
		"Oswego",
	]);
	setup_markers(game.british.stockades, [
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

	game.british.pool.push(find_unused_piece("Abercromby"));
	game.british.pool.push(find_unused_piece("Bradstreet"));
	game.british.pool.push(find_unused_piece("Loudoun"));
	game.british.pool.push(find_unused_piece("Murray"));
	game.british.pool.push(find_unused_piece("Webb"));

	game.events.once_french_regulars = 1;
}

exports.setup = function (seed, scenario, options) {
	load_game_state({
		seed: seed,
		options: options,
		state: null,
		active: FRANCE,

		// Tracks, VP, and event triggers
		year: 1755,
		end_year: 1762,
		season: 0,
		pa: 0,
		vp: 0,
		niagara: 1,
		ohio_forks: 1,
		events: {},

		// Cards
		last_card: 0,
		deck: [],
		discard: [],
		removed: [],

		// Leaders and units
		location: pieces.map(() => 0),
		reduced: [],

		// Markers
		sieges: {},
		amphib: [],
		fieldworks: [],

		// Per-player state
		french: {
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
		british: {
			hand: [],
			held: 0,
			did_construct: 0,
			allied: [],
			stockades: [],
			forts_uc: [],
			forts: [],
			fortresses: originally_british_fortresses.slice(),
			raids: [],
			pool: [],
		},

		// Temporary action state
		count: 0,
		// activation_value: 0,
		// activation: [],
		// move: {},
		// battle: {},
		// raid: {},
		// go_home: {},

		// Log summaries
		summary: {
			placed: {},
			restored: {},
			reduced: {},
			eliminated: {},
		},
		undo: [],
		log: [],
	});

	switch (scenario) {
	default:
	// Start at 2VP for balance.
	// See https://boardgamegeek.com/thread/1366550/article/19163465#19163465
	// fallthrough
	case "Annus Mirabilis": setup_1757(1759, 2); break;
	case "Early War Campaign": setup_1755(1759); break;
	case "Late War Campaign": setup_1757(1762, 4); break;
	case "The Full Campaign": setup_1755(1762); break;
	}

	log(".h1 " + scenario);
	logbr();

	if (game.options.retroactive) {
		log(`Retroactive "Foul Weather".`);
	}

	if (game.options.no_foul_weather) {
		log(`${card_name(FOUL_WEATHER)} removed.`);
		remove_from_array(game.deck, FOUL_WEATHER);
		game.removed.push(FOUL_WEATHER);
	}

	if (game.options.pitt_dip_rev) {
		log(`William Pitt and Diplomatic Revolution are linked.`);
	}

	if (game.options.raid_militia) {
		// TODO
		log(`Enemy raid in a department cause a militia step loss.`);
		log("NOT IMPLEMENTED");
	}

	if (game.options.regulars_vp) {
		log(`Regulars cost 1 VP before 1757.`);
	}

	if (game.options.surrender) {
		// TODO
		log(`Surrender! playable by either side.`);
		log("NOT IMPLEMENTED");
	}

	if (game.options.acadians) {
		log(`Acadians Expelled playable by either side.`);
	}

	if (game.options.regulars_from_discard) {
		log(`After 1756 Britain may exchange a random card for a discarded Regulars or Highlanders.`);
	}

	start_year();

	return game;
}

// ACTION HANDLERS

function clear_undo() {
	game.undo = [];
}

function push_undo() {
	game.undo.push(JSON.stringify(game, (k,v) => {
		if (k === 'undo') return 0;
		if (k === 'log') return v.length;
		return v;
	}));
}

function pop_undo() {
	let save_undo = game.undo;
	let save_log = game.log;
	game = JSON.parse(save_undo.pop());
	game.undo = save_undo;
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

function gen_action_space(s) {
	gen_action('space', s);
}

function gen_action_piece(p) {
	gen_action('piece', p);
}

function gen_action_discard(c) {
	gen_action('card', c);
}

function load_game_state(state) {
	game = state;
	update_active_aliases();
}

exports.resign = function (state, current) {
	load_game_state(state);
	if (game.state !== 'game_over')
		goto_game_over(enemy(), current + " resigned.");
	return game;
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
	return game;
}

exports.query = function (state, current, q) {
	if (q === 'supply') {
		load_game_state(state, current);
		return query_supply();
	}
	if (q === 'discard') {
		load_game_state(state, current);
		return game.discard;
	}
	if (q === 'removed') {
		load_game_state(state, current);
		return game.removed;
	}
	return null;
}

exports.is_checkpoint = function (a, b) {
	let x = b.log[b.log.length-2];
	if (x === ".h2 Britain") return true;
	if (x === ".h2 France") return true;
	return false;
}

exports.view = function(state, current) {
	load_game_state(state);

	if (game.retro_foul_weather && game.state !== 'foul_weather' && current !== game.active) {
		game = JSON.parse(game.retro_foul_weather);
	}

	view = {
		vp: game.vp, pa: game.pa, year: game.year, season: game.season,
		events: game.events,
		location: game.location,
		reduced: game.reduced,
		sieges: game.sieges,
		amphib: game.amphib,
		fieldworks: game.fieldworks,
		last_card: game.last_card,
		// deck: game.deck.length,
		french: {
			hand: game.french.hand.length,
			allied: game.french.allied,
			stockades: game.french.stockades,
			forts_uc: game.french.forts_uc,
			forts: game.french.forts,
			fortresses: game.french.fortresses,
			raids: game.french.raids,
		},
		british: {
			hand: game.british.hand.length,
			allied: game.british.allied,
			stockades: game.british.stockades,
			forts_uc: game.british.forts_uc,
			forts: game.british.forts,
			fortresses: game.british.fortresses,
			raids: game.british.raids,
			pool: game.british.pool,
		},
		active: game.active,
		prompt: null,
		actions: null,
		log: game.log,
	};

	if (game.activation)
		view.activation = game.activation;
	if (game.british.held)
		view.british.held = 1;
	if (game.french.held)
		view.french.held = 1;

	if (current === FRANCE)
		view.hand = game.french.hand;
	else if (current === BRITAIN)
		view.hand = game.british.hand;
	else
		view.hand = [];

	if (!states[game.state]) {
		view.prompt = "Invalid game state: " + game.state;
		return view;
	}

	if (current === 'Observer' || game.active !== current) {
		let inactive = states[game.state].inactive;
		if (typeof inactive === 'function')
			states[game.state].inactive();
		else if (typeof inactive === 'string')
			view.prompt = `Waiting for ${game.active} \u2014 ${inactive}...`;
		else
			view.prompt = `Waiting for ${game.active} \u2014 ${game.state.replace(/_/g, " ")}...`;
	} else {
		states[game.state].prompt();
		gen_action_undo();
	}

	return view;
}
