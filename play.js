"use strict";

function abs(x) {
	return x < 0 ? -x : x;
}

// PIECE AND SPACE RANGES
const first_space = 1;
const last_space = 141;
const first_piece = 1;
const last_piece = 151;
const first_leader_box = 145;
const last_leader_box = 167;
function is_leader(p) { return (p >= 1 && p <= 13) || (p >= 87 && p <= 96); }
function is_unit(p) { return (p >= 14 && p <= 86) || (p >= 97 && p <= 151); }
function is_auxiliary(p) { return (p >= 14 && p <= 25) || (p >= 97 && p <= 126); }
function is_drilled_troops(p) { return (p >= 26 && p <= 82) || (p >= 127 && p <= 147); }
function is_indian(p) { return (p >= 14 && p <= 22) || (p >= 97 && p <= 118); }

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
function leader_box(p) { return box_from_leader[p]; }
function box_leader(s) { return leader_from_box[s-first_leader_box]; }

function is_unit_reduced(p) {
	return view.reduced.includes(p);
}

function unit_strength(p) {
	if (is_unit_reduced(p))
		return pieces[p].reduced_strength;
	return pieces[p].strength;
}

function force_strength(ldr) {
	let str = 0;
	let s = leader_box(ldr);
	for (let p = 1; p <= last_piece; ++p)
		if (view.location[p] === s)
			if (is_unit(p))
				str += unit_strength(p);
	return str;
}

function stack_strength(stack) {
	let str = 0;
	for (let i = 0; i < stack.length; ++i) {
		let p = stack[i][0];
		if (p > 0) {
			if (is_leader(p))
				str += force_strength(p);
			else
				str += unit_strength(p);
		}
	}
	return str;
}

function is_supreme_commander(ldr, stack) {
	// If anyone else is moving from here, we're not supreme anymore!
	for (let i = 0; i < stack.length; ++i) {
		let p = stack[i][0];
		if (is_leader(p) && p !== ldr)
			if (force_strength(p) > 0)
				return false;
	}
	// Otherwise, if we're on top of the stack, we're supreme!
	for (let i = 0; i < stack.length; ++i) {
		let p = stack[i][0];
		if (is_leader(p))
			return (p === ldr);
	}
	return false;
}

function check_menu(id, x) {
	document.getElementById(id).className = x ? "menu_item checked" : "menu_item unchecked";
}

// LAYOUT AND STYLE OPTIONS

let layout = 0;
let style = "bevel";
let mouse_focus = 0;

function set_layout(x) {
	layout = x;
	window.localStorage[params.title_id + "/layout"] = layout;
	check_menu("stack_v", layout === 0);
	check_menu("stack_h", layout === 1);
	check_menu("stack_d", layout === 2);
	if (view)
		update_map();
}

function set_style(x) {
	style = x;
	window.localStorage[params.title_id + "/style"] = x;
	check_menu("style_bevel", style === "bevel");
	check_menu("style_flat", style === "flat");
	let body = document.querySelector("body");
	body.classList.toggle("bevel", style === "bevel");
	body.classList.toggle("flat", style === "flat");
	if (view)
		update_map();
}

function set_mouse_focus(x) {
	if (x === undefined)
		mouse_focus = 1 - mouse_focus;
	else
		mouse_focus = x;
	window.localStorage[params.title_id + "/mouse_focus"] = mouse_focus;
	check_menu("mouse_focus", mouse_focus === 1);
}

set_layout(window.localStorage[params.title_id + "/layout"] | 0);
set_style(window.localStorage[params.title_id + "/style"] || "bevel");
set_mouse_focus(window.localStorage[params.title_id + "/mouse_focus"] | 0);

let focus = null;
let focus_box = document.getElementById("focus");

// SUPPLY LINE DISPLAY

let showing_supply = false;

function show_supply(supply) {
	showing_supply = true;
	for (let s = 1; s <= last_space; ++s) {
		spaces[s].element.classList.toggle("french_supply", supply.french.includes(s));
		spaces[s].element.classList.toggle("british_supply", supply.british.includes(s));
	}
}

function hide_supply() {
	if (showing_supply) {
		showing_supply = false;
		for (let s = 1; s <= last_space; ++s) {
			spaces[s].element.classList.remove("french_supply");
			spaces[s].element.classList.remove("british_supply");
		}
	}
}

const DEBUG_CONNECTIONS = false;

const RELUCTANT = 0;
const SUPPORTIVE = 1;
const ENTHUSIASTIC = 2;

const EARLY = 0;
const LATE = 1;

const VP_MARKER = "marker vps ";
const PA_MARKER = "marker provincial_assemblies ";
const SEASON_MARKER_FF = "marker season_french_first ";
const SEASON_MARKER_BF = "marker season_british_first ";
const SIEGE_MARKER = [
	"marker small siege_0",
	"marker small siege_1",
	"marker small siege_2",
];
const FIELDWORKS_MARKER = [
	"marker fieldworks"
];

const BRITISH_FORT_NAMES = {
	"Augusta": "Virginia fortification line",
	"Carlisle": "Pennsylvania fortification line",
	"Charlestown": "Fort No. 4",
	"Easton": "Pennsylvania fortification line",
	"Harris's Ferry": "Pennsylvania fortification line",
	"Hoosic": "Fort Massachusetts",
	"Hudson Carry North": "Fort William Henry",
	"Hudson Carry South": "Fort Lyman, aka Fort Edward",
	"Lancaster": "Pennsylvania fortification line",
	"Oneida Carry East": "Fort Williams",
	"Oneida Carry West": "Fort Bull",
	"Oswego": "Fort Oswego",
	"Reading": "Pennsylvania fortification line",
	"Schenectady": "Forts Johnson and Hunter",
	"Shamokin": "Fort Augusta",
	"Shepherd's Ferry": "Fort Frederick",
	"Will's Creek": "Fort Cumberland",
	"Winchester": "Fort Loudoun",
	"Woodstock": "Virginia fortification line",
}

const FRENCH_FORT_NAMES = {
	"Cataraqui": "Fort Frontenac",
	"Crown Point": "Fort St-Frédéric",
	"French Creek": "Fort Le Boeuf",
	"Niagara": "Fort Niagara",
	"Ohio Forks": "Fort Duquesne",
	"Oswegatchie": "La Galette & La Présentation",
	"Presqu'île": "Fort Presqu'île",
	"St-Jean": "Forts Chambly and St-Jean",
	"Ticonderoga": "Fort Carillon",
	"Toronto": "Fort Rouillé",
	"Venango": "Fort Machault",
	"Île-aux-Noix": "Fort Île-aux-Noix",
}

const INDIAN_ALLIED_NAMES = {
	"Canajoharie": "Mohawk",
	"St-François": "Abenaki",
	"Lac des Deux Montagnes": "Algonquin",
	"Kahnawake": "Caughnawaga",
	"Mississauga": "Mississauga",
	"Kittaning": "Delaware",
	"Mingo Town": "Mingo",
	"Logstown": "Shawnee",
	"Pays d'en Haut": "Huron, Ojibwa, Ottawa, Potawatomi",
	"Cayuga": "Cayuga",
	"Oneida_castle": "Oneida",
	"Onondaga": "Onondaga",
	"Karaghiyadirha": "Seneca",
	"Shawiangto": "Tuscarora",
}

// Patch up leader/box associations.
for (let s = 1; s < spaces.length; ++s) {
	if (spaces[s].type === 'leader-box') {
		let p = pieces.findIndex(x => x.name === spaces[s].name);
		spaces[s].leader = p;
		pieces[p].box = s;
	}
}

function print(x) {
	console.log(JSON.stringify(x, (k,v)=>k==='log'?undefined:v));
}

function on_focus_card_tip(card_number) {
	document.getElementById("tooltip").className = "card show card_" + card_number;
}

function on_blur_card_tip() {
	document.getElementById("tooltip").classList = "card";
}

function on_focus_last_card() {
	console.log("focus", view.last_card);
	if (typeof view.last_card === 'number') {
		document.getElementById("tooltip").className = "card show card_" + view.last_card;
	}
}

function on_blur_last_card() {
	document.getElementById("tooltip").classList = "card";
}

function on_focus_pa_marker() {
	on_focus_bpa(view.pa);
}

function on_focus_bpa(level) {
	switch (level) {
	case 0:
		document.getElementById("status").textContent =
			`Reluctant: Max 2 southern & 6 northern provincials. No "Raise Provincial Regiments."`;
		break;
	case 1:
		document.getElementById("status").textContent =
			`Supportive: Max 4 southern & 10 northern provincials.`;
		break;
	case 2:
		document.getElementById("status").textContent =
			`Enthusiastic: Unlimited provincials. No "Stingy Provincial Assembly."`;
		break;
	}
}

function on_blur_bpa() {
	document.getElementById("status").textContent = "";
}

function on_log_line(text, cn) {
	let p = document.createElement("div");
	if (cn) p.className = cn;
	p.innerHTML = text;
	return p;
}

function on_log(text) {
	let p = document.createElement("div");
	text = text.replace(/&/g, "&amp;");
	text = text.replace(/</g, "&lt;");
	text = text.replace(/>/g, "&gt;");
	text = text.replace(/#(\d+)[^\]]*\]/g,
		'<span class="tip" onmouseenter="on_focus_card_tip($1)" onmouseleave="on_blur_card_tip()">$&</span>');
	if (text.match(/^\.h1/)) {
		text = text.substring(4);
		p.className = 'h1';
	}
	if (text.match(/^\.h2/)) {
		text = text.substring(4);
		if (text === 'France')
			p.className = 'h2 france';
		else if (text === 'Britain')
			p.className = 'h2 britain';
		else
			p.className = 'h2';
	}
	if (text.match(/^\.h3/)) {
		text = text.substring(4);
		p.className = 'h3';
	}
	if (text.match(/^\.assault/)) {
		text = "Assault at " + text.substring(9);
		p.className = 'h3 assault';
	}
	if (text.match(/^\.battle/)) {
		text = "Battle at " + text.substring(8);
		p.className = 'h3 battle';
	}
	if (text.match(/^\.siege/)) {
		text = "Siege at " + text.substring(7);
		p.className = 'h3 siege';
	}
	if (text.match(/^\.raid/)) {
		text = "Raid at " + text.substring(6);
		p.className = 'h3 raid';
	}

	if (text.indexOf("\n") < 0) {
		p.innerHTML = text;
	} else {
		text = text.split("\n");
		p.appendChild(on_log_line(text[0]));
		for (let i = 1; i < text.length; ++i)
			p.appendChild(on_log_line(text[i], "indent"));
	}
	return p;
}

function show_card_list(id, list) {
	document.getElementById(id).classList.remove("hide");
	let body = document.getElementById(id + "_body");
	while (body.firstChild)
		body.removeChild(body.firstChild);
	if (list.length === 0) {
		body.innerHTML = "<div>None</div>";
	}
	for (let c of list) {
		let p = document.createElement("div");
		p.className = "tip";
		p.onmouseenter = () => on_focus_card_tip(c);
		p.onmouseleave = on_blur_card_tip;
		p.textContent = `#${c} ${cards[c].name} [${cards[c].activation}]`;
		body.appendChild(p);
	}
}

function hide_card_list(id) {
	document.getElementById(id).classList.add("hide");
}

function on_reply(q, params) {
	if (q === 'supply')
		show_supply(params);
	if (q === 'discard')
		show_card_list("discard", params);
	if (q === 'removed')
		show_card_list("removed", params);
}

let ui = {
	map: document.getElementById("map"),
	status: document.getElementById("status"),
	spaces: document.getElementById("spaces"),
	markers: document.getElementById("markers"),
	pieces: document.getElementById("pieces"),
	cards: document.getElementById("cards"),
	last_card: document.getElementById("last_card"),
}

const marker_info = {
	french: {
		allied: { name: "French Allied", counter: "marker french_allied" },
		forts: { name: "French Fort", counter: "marker french_fort" },
		forts_uc: { name: "French Fort U/C", counter: "marker french_fort_uc" },
		stockades: { name: "French Stockade", counter: "marker french_stockade" },
		raids: { name: "French Raided", counter: "marker small french_raided" },
	},
	british: {
		allied: { name: "British Allied", counter: "marker british_allied" },
		forts: { name: "British Fort", counter: "marker british_fort" },
		forts_uc: { name: "British Fort U/C", counter: "marker british_fort_uc" },
		stockades: { name: "British Stockade", counter: "marker british_stockade" },
		raids: { name: "British Raided", counter: "marker small british_raided" },
		amphib: { name: "Amphibious Landing", counter: "marker amphib" },
	},
}

let markers = {
	french: {
		allied: [],
		forts: [],
		forts_uc: [],
		stockades: [],
		raids: [],
	},
	british: {
		allied: [],
		forts: [],
		forts_uc: [],
		stockades: [],
		raids: [],
		amphib: [],
	},
	sieges: [],
	fieldworks: [],
}

function toggle_counters() {
	// Cycle between showing everything, only markers, and nothing.
	if (ui.map.classList.contains("hide_markers")) {
		ui.map.classList.remove("hide_markers");
		ui.map.classList.remove("hide_pieces");
	} else if (ui.map.classList.contains("hide_pieces")) {
		ui.map.classList.add("hide_markers");
	} else {
		ui.map.classList.add("hide_pieces");
	}
}

function for_each_piece_in_space(s, fun) {
	for (let p = 1; p < pieces.length; ++p)
		if (abs(view.location[p]) === s)
			fun(p);
}

// TOOLTIPS

function on_click_space(evt) {
	if (evt.button === 0) {
		hide_supply();
		if (view.actions && view.actions.space && view.actions.space.includes(evt.target.space)) {
			event.stopPropagation();
			send_action('space', evt.target.space);
		}
	}
}

const montcalm_and_co = [ "Montcalm", "Bougainville", "Lévis" ];
const wolfe_and_co = [ "Amherst", "Forbes", "Wolfe" ];

function is_leader_dead(p) {
	let s = abs(view.location[p]);
	if (s)
		return false;
	if (view.british.pool.includes(p))
		return false;
	if (view.events.once_french_regulars && montcalm_and_co.includes(pieces[p].name))
		return false;
	if (wolfe_and_co.includes(pieces[p].name))
		return view.events.pitt || view.year >= 1759;
	return true;
}

function is_leader_in_pool(p) {
	return view.british.pool.includes(p);
}

function is_leader_unavailable(p) {
	let s = view.location[p];
	if (s)
		return false;
	return !is_leader_in_pool(p) && !is_leader_dead(p);
}

function on_focus_space(evt) {
	let id = evt.target.space;
	let space = spaces[id];
	let text = space.name;
	if (space.type === 'leader-box') {
		if (view) {
			let p = space.leader;
			let s = abs(view.location[p]);
			if (!s) {
				if (is_leader_dead(p))
					text += " (eliminated)";
				else if (is_leader_in_pool(p))
					text += " (pool)";
				else
					text += " (unavailable)";
			} else {
				text += " (" + spaces[s].name + ")";
			}
		}
	} else if (space.type === 'militia-box') {
		//
	} else {
		let list = [];
		if (space.type !== 'box')
			list.push(space.type);
		if (space.is_port)
			list.push("port");
		if (space.is_fortress)
			list.push("fortress");
		if (space.department) {
			if (space.department === 'st_lawrence')
				list.push("st. lawrence department")
			else
				list.push(space.department + " department");
		}
		if (list.length > 0)
			text += " (" + list.join(", ") + ")";
	}
	ui.status.textContent = text;
	if (DEBUG_CONNECTIONS) {
		space.element.classList.add('highlight');
		space.land.forEach(n => spaces[n].element.classList.add('highlight'));
		space.river.forEach(n => spaces[n].element.classList.add('highlight'));
		space.lakeshore.forEach(n => spaces[n].element.classList.add('highlight'));
	}
}

function on_blur_space(evt) {
	let id = evt.target.space;
	ui.status.textContent = "";

	if (DEBUG_CONNECTIONS) {
		spaces.forEach(n => n.element && n.element.classList.remove('highlight'));
	}
}

function stack_piece_count(stack) {
	let n = 0;
	for (let i = 0; i < stack.length; ++i)
		if (stack[i][0] > 0)
			++n;
	return n;
}

function blur_stack() {
	if (focus !== null) {
		// console.log("BLUR STACK");
		focus = null;
	}
	update_map();
}

function is_small_stack(stk) {
	return stk.length <= 1 || (stack_piece_count(stk) === 1 && stk.length <= 2);
}

function focus_stack(stack) {
	if (focus !== stack) {
		// console.log("FOCUS STACK", stack ? stack.name : "null");
		focus = stack;
		update_map();
		return is_small_stack(stack);
	}
	return true;
}

document.getElementById("map").addEventListener("mousedown", evt => { 
	if (evt.button === 0) {
		hide_supply();
		blur_stack();
	}
});

function on_click_piece(evt) {
	if (evt.button === 0) {
		hide_supply();
		event.stopPropagation();
		if (focus_stack(evt.target.my_stack)) {
			send_action('piece', evt.target.piece);
		}
	}
}

function on_click_marker(evt) {
	if (evt.button === 0) {
		hide_supply();
		event.stopPropagation();
		focus_stack(evt.target.my_stack);
	}
}

function on_focus_piece(evt) {
	let id = evt.target.piece;
	let piece = pieces[id];
	// evt.target.style.zIndex = 300;
	if (view.reduced.includes(id))
		ui.status.textContent = piece.rdesc;
	else
		ui.status.textContent = piece.desc;
	if (mouse_focus)
		focus_stack(evt.target.my_stack);
}

function on_blur_piece(evt) {
	let id = evt.target.piece;
	let piece = pieces[id];
	// evt.target.style.zIndex = piece.z;
	ui.status.textContent = "";
}

function on_focus_leader(evt) {
	let id = evt.target.piece;
	let piece = pieces[id];
	// evt.target.style.zIndex = 300;
	let str = force_strength(id);
	if (str > 0)
		ui.status.textContent = piece.desc + " (" + str + " strength)";
	else if (is_supreme_commander(id, evt.target.my_stack))
		ui.status.textContent = piece.desc + " (" + stack_strength(evt.target.my_stack) + " strength)";
	else
		ui.status.textContent = piece.desc;
	if (mouse_focus)
		focus_stack(evt.target.my_stack);
}

function on_blur_leader(evt) {
	let id = evt.target.piece;
	let piece = pieces[id];
	// evt.target.style.zIndex = piece.z;
	ui.status.textContent = "";
}

function is_fortification_marker(marker) {
	return marker.type === 'forts' || marker.type === 'forts_uc' || marker.type === 'stockades';
}

function is_allied_marker(marker) {
	return marker.type === 'allied';
}

function on_focus_marker(evt) {
	let marker = evt.target.marker;
	let space = spaces[marker.space_id];
	let name = marker.name;
	if (is_allied_marker(marker))
		name += " (" + INDIAN_ALLIED_NAMES[space.name] + ")";
	if (is_fortification_marker(marker)) {
		if (marker.faction === 'british' && space.name in BRITISH_FORT_NAMES)
			name += " (" + BRITISH_FORT_NAMES[space.name] + ")";
		if (marker.faction === 'french' && space.name in FRENCH_FORT_NAMES)
			name += " (" + FRENCH_FORT_NAMES[space.name] + ")";
	}
	ui.status.textContent = name;
	if (mouse_focus)
		focus_stack(evt.target.my_stack);
}

function on_blur_marker(evt) {
	let marker = evt.target.marker;
	ui.status.textContent = "";
}

function on_focus_card(evt) {
	let id = evt.target.card;
	let card = cards[id];
	ui.status.textContent = `#${id} ${card.name} [${card.activation}]`;
}

function on_blur_card(evt) {
	ui.status.textContent = "";
}

// CARD MENU

const card_action_menu = [
	'play_event',
	'activate_force',
	'activate_individually',
	'construct_stockades',
	'construct_forts',
	'discard',
];

let current_popup_card = 0;

function show_popup_menu(evt, list) {
	document.querySelectorAll("#popup div").forEach(e => e.classList.remove('enabled'));
	for (let item of list) {
		let e = document.getElementById("menu_" + item);
		e.classList.add('enabled');
	}
	let popup = document.getElementById("popup");
	popup.style.display = 'block';
	popup.style.left = (evt.clientX-50) + "px";
	popup.style.top = (evt.clientY-12) + "px";
	cards[current_popup_card].element.classList.add("selected");
}

function hide_popup_menu() {
	let popup = document.getElementById("popup");
	popup.style.display = 'none';
	if (current_popup_card) {
		cards[current_popup_card].element.classList.remove("selected");
		current_popup_card = 0;
	}
}

function is_card_enabled(card) {
	if (view.actions) {
		if (card_action_menu.some(a => view.actions[a] && view.actions[a].includes(card)))
			return true;
		if (view.actions.card && view.actions.card.includes(card))
			return true;
	}
	return false;
}

function is_card_action(action, card) {
	return view.actions && view.actions[action] && view.actions[action].includes(card);
}

function on_click_card(evt) {
	let card = evt.target.card;
	if (is_card_action('card', card)) {
		send_action('card', card);
	} else {
		let menu = card_action_menu.filter(a => is_card_action(a, card));
		if (menu.length > 0) {
			current_popup_card = card;
			show_popup_menu(evt, menu);
		}
	}
}

function on_play_event() {
	send_action('play_event', current_popup_card);
	hide_popup_menu();
}

function on_activate_force() {
	send_action('activate_force', current_popup_card);
	hide_popup_menu();
}

function on_activate_individually() {
	send_action('activate_individually', current_popup_card);
	hide_popup_menu();
}

function on_construct_stockades() {
	send_action('construct_stockades', current_popup_card);
	hide_popup_menu();
}

function on_construct_forts() {
	send_action('construct_forts', current_popup_card);
	hide_popup_menu();
}

function on_discard() {
	send_action('discard', current_popup_card);
	hide_popup_menu();
}

// BUILD UI

function build_siege_marker(space_id) {
	let list = markers.sieges;
	let marker = list.find(e => e.space_id === space_id);
	if (marker)
		return marker;
	marker = { space_id: space_id, name: "Siege", type: "Siege", element: null, level: 0 };
	let elt = marker.element = document.createElement("div");
	elt.marker = marker;
	elt.className = SIEGE_MARKER[marker.level];
	elt.addEventListener("mousedown", on_click_marker);
	elt.addEventListener("mouseenter", on_focus_marker);
	elt.addEventListener("mouseleave", on_blur_marker);
	elt.my_size = 36;
	list.push(marker);
	ui.markers.appendChild(elt);
	return marker;
}

function update_siege_marker(space_id, level) {
	let marker = build_siege_marker(space_id);
	marker.level = level;
	marker.element.className = SIEGE_MARKER[marker.level];
	return marker.element;
}

function destroy_siege_marker(space_id) {
	let list = markers.sieges;
	let ix = list.findIndex(e => e.space_id === space_id);
	if (ix >= 0) {
		list[ix].element.remove();
		list.splice(ix, 1);
	}
}

function build_fieldworks_marker(space_id) {
	let list = markers.fieldworks;
	let marker = list.find(e => e.space_id === space_id);
	if (marker)
		return marker.element;
	marker = { space_id: space_id, name: "Fieldworks", type: "Fieldworks", element: null };
	let elt = marker.element = document.createElement("div");
	elt.marker = marker;
	elt.className = FIELDWORKS_MARKER;
	elt.addEventListener("mousedown", on_click_marker);
	elt.addEventListener("mouseenter", on_focus_marker);
	elt.addEventListener("mouseleave", on_blur_marker);
	elt.my_size = 45;
	list.push(marker);
	ui.markers.appendChild(elt);
	return marker.element;
}

function destroy_fieldworks_marker(space_id) {
	let list = markers.fieldworks;
	let ix = list.findIndex(e => e.space_id === space_id);
	if (ix >= 0) {
		list[ix].element.remove();
		list.splice(ix, 1);
	}
}

function build_faction_marker(space_id, faction, what) {
	let list = markers[faction][what];
	let marker = list.find(e => e.space_id === space_id);
	if (marker)
		return marker.element;
	marker = { space_id: space_id, name: marker_info[faction][what].name, faction: faction, type: what, element: null };
	let elt = marker.element = document.createElement("div");
	elt.marker = marker;
	elt.className = marker_info[faction][what].counter;
	elt.addEventListener("mousedown", on_click_marker);
	elt.addEventListener("mouseenter", on_focus_marker);
	elt.addEventListener("mouseleave", on_blur_marker);
	if (what === 'raids')
		elt.my_size = 36;
	else
		elt.my_size = 45;
	list.push(marker);
	ui.markers.appendChild(elt);
	return marker.element;
}

function destroy_faction_marker(space_id, faction, what) {
	let list = markers[faction][what];
	let ix = list.findIndex(e => e.space_id === space_id);
	if (ix >= 0) {
		list[ix].element.remove();
		list.splice(ix, 1);
	}
}

function build_space(id) {
	let space = spaces[id];
	/* Make space for border */
	let x = space.x;
	let y = space.y;
	let w = space.w;
	let h = space.h;

	if (space.type === 'box') { x -= 1; y -= 1; w -= 9; h -= 9; }
	if (space.type === 'militia-box') { x -= 1; y -= 1; w -= 9; h -= 9; }
	if (space.type === 'cultivated') { x -= 1; y -= 1; w -= 9; h -= 9; }
	if (space.type === 'wilderness') { x -= 1; y -= 1; w -= 9; h -= 9; }
	if (space.type === 'leader-box') { x -= 1; y -= 1; w -= 9; h -= 9; }

	space.fstack = [];
	space.fstack.name = spaces[id].name + "/french";
	space.bstack = [];
	space.bstack.name = spaces[id].name + "/british";

	let elt = space.element = document.createElement("div");
	elt.space = id;
	elt.className = space.type;
	elt.style.left = x + "px";
	elt.style.top = y + "px";
	elt.style.width = w + "px";
	elt.style.height = h + "px";
	elt.addEventListener("mousedown", on_click_space);
	elt.addEventListener("mouseenter", on_focus_space);
	elt.addEventListener("mouseleave", on_blur_space);

	if (space.type === 'leader-box')
		elt.classList.add(pieces[box_leader(id)].faction);

	ui.spaces.appendChild(elt);
}

function build_leader(id) {
	let leader = pieces[id];
	let elt = leader.element = document.createElement("div");
	elt.piece = id;
	elt.className = "offmap leader " + leader.faction + " " + leader.square;
	elt.addEventListener("mousedown", on_click_piece);
	elt.addEventListener("mouseenter", on_focus_leader);
	elt.addEventListener("mouseleave", on_blur_leader);
	ui.pieces.insertBefore(elt, ui.pieces.firstChild);
}

function build_unit(id) {
	let unit = pieces[id];
	let elt = unit.element = document.createElement("div");
	elt.piece = id;
	elt.className = "offmap unit " + unit.faction + " " + unit.counter;
	elt.addEventListener("mousedown", on_click_piece);
	elt.addEventListener("mouseenter", on_focus_piece);
	elt.addEventListener("mouseleave", on_blur_piece);
	ui.pieces.insertBefore(elt, ui.pieces.firstChild);
}

function build_card(id) {
	let card = cards[id];
	let elt = card.element = document.createElement("div");
	elt.card = id;
	elt.className = "card card_" + id;
	elt.addEventListener("click", on_click_card);
	elt.addEventListener("mouseenter", on_focus_card);
	elt.addEventListener("mouseleave", on_blur_card);
	ui.cards.appendChild(elt);
}

for (let c = 1; c < cards.length; ++c)
	build_card(c);
for (let s = 1; s < spaces.length; ++s)
	build_space(s);
for (let p = 0; p < pieces.length; ++p)
	if (pieces[p].type === 'leader')
		build_leader(p);
	else
		build_unit(p);

document.getElementById("last_card").addEventListener("mouseenter", on_focus_last_card);
document.getElementById("last_card").addEventListener("mouseleave", on_blur_last_card);

// UPDATE UI

function is_action_piece(p) {
	if (view.actions && view.actions.piece && view.actions.piece.includes(p))
		return true;
	if (view.who === p)
		return true;
	return false;
}

const indian_homes = {
	"Cherokee": null,
	"Mohawk": "Canajoharie",
	"Huron": "Pays d'en Haut",
	"Ojibwa": "Pays d'en Haut",
	"Ottawa": "Pays d'en Haut",
	"Potawatomi": "Pays d'en Haut",
	"Abenaki": "St-François",
	"Algonquin": "Lac des Deux Montagnes",
	"Caughnawaga": "Kahnawake",
	"Mississauga": "Mississauga",
	"Delaware": "Kittaning",
	"Mingo": "Mingo Town",
	"Shawnee": "Logstown",
	"Cayuga": "Cayuga",
	"Oneida": "Oneida Castle",
	"Onondaga": "Onondaga",
	"Seneca": "Karaghiyadirha",
	"Tuscarora": "Shawiangto",
}

function is_different_piece(a, b) {
	if (a > 0 && b > 0) {
		if (pieces[a].type !== pieces[b].type)
			return true;
		if (pieces[a].type === 'indian')
			if (indian_homes[pieces[a].name] !== indian_homes[pieces[a].name])
				return true;
		if (view.reduced.includes(a) !== view.reduced.includes(b))
			return true;
		return false;
	}
	return true;
}

const style_dims = {
	flat: {
		width: 47,
		gap: 2,
		thresh: [ 24, 16, 10,  8,  6,  0 ],
		offset: [  1,  2,  3,  4,  5,  6 ],
		focus_margin: 5,
	},
	bevel: {
		width: 49,
		gap: 4,
		thresh: [ 24, 16, 10,  8,  6,  0 ],
		offset: [  1,  2,  3,  4,  5,  6 ],
		focus_margin: 6,
	},
}

const MINX = 15;
const MINY = 15;
const MAXX = 2550 - 15;

// TODO: two or more columns/rows if too many pieces in stack
// TODO: separate layout for leader and militia boxes

function layout_stack(stack, x, y, dx) {
	let dim = style_dims[style];
	let z = (stack === focus) ? 101 : 1;

	let n = stack.length;
	if (n > 32) n = Math.ceil(n / 4);
	else if (n > 24) n = Math.ceil(n / 3);
	else if (n > 10) n = Math.ceil(n / 2);
	let m = Math.ceil(stack.length / n);

	// Lose focus if stack is small.
	if (stack === focus && is_small_stack(stack))
		focus = null;

	if (stack === focus) {
		let w, h;
		if (layout === 0) {
			h = (dim.width + dim.gap) * (n-1);
			w = (dim.width + dim.gap) * (m-1)
		}
		if (layout === 1) {
			h = (dim.width + dim.gap) * (m-1);
			w = (dim.width + dim.gap) * (n-1);
		}
		if (y - h < MINY)
			y = h + MINY;
		focus_box.style.top = (y-h-dim.focus_margin) + "px";
		if (dx > 0) {
			if (x + w > MAXX - dim.width)
				x = MAXX - dim.width - w;
			focus_box.style.left = (x-dim.focus_margin) + "px";
		} else {
			if (x - w < MINX)
				x = w + MINX;
			focus_box.style.left = (x-w-dim.focus_margin) + "px";
		}
		focus_box.style.width = (w+dim.width + 2*dim.focus_margin) + "px";
		focus_box.style.height = (h+dim.width + 2*dim.focus_margin) + "px";
	}

	let start_x = x;
	let start_y = y;

	for (let i = stack.length-1; i >= 0; --i, ++z) {
		let ii = stack.length - i;
		let [p, elt] = stack[i];
		let next_p = i > 0 ? stack[i-1][0] : 0;

		if (layout === 2 && stack === focus) {
			if (y < MINY) y = MINY;
			if (x < MINX) x = MINX;
			if (x > MAXX - dim.width) x = MAXX - dim.width ;
		}

		let ex = x;
		let ey = y;
		if (p > 0) {
			if (is_auxiliary(p)) {
				ex -= 2;
				ey -= 2;
			}
		} else {
			ex += Math.floor((45-elt.my_size) / 2);
			ey += Math.floor((45-elt.my_size) / 2);
		}

		elt.style.left = Math.round(ex) + "px";
		elt.style.top = Math.round(ey) + "px";
		elt.style.zIndex = z;

		if (p > 0)
			pieces[p].z = z;

		if (stack === focus || is_small_stack(stack)) {
			switch (layout) {
			case 2: // Diagonal
				if (y <= MINY + 25) {
					x -= (dim.width + dim.gap);
					y = MINY;
					continue;
				}
				if (x <= MINX + 25) {
					y -= (dim.width + dim.gap);
					x = MINX;
					continue;
				}
				if (x >= MAXX - dim.width - 25) {
					y -= (dim.width + dim.gap);
					x = MAXX - dim.width;
					continue;
				}
				if (p > 0) {
					if (is_leader(p)) {
						x += 20;
						y -= 20;
					} else if (is_indian(p)) {
						x -= 20;
						// show stripe
						if (style === 'bevel')
							y -= 28;
						else
							y -= 26;
					} else if (is_auxiliary(p)) {
						x -= 20;
						y -= 20;
					} else {
						x += dx * 20;
						y -= 20;
					}
				} else {
					x += dx * 15;
					y -= 15;
				}
				break;

			case 0: // Vertical
				x = start_x + dx * (dim.width + dim.gap) * Math.floor(ii / n);
				y = start_y - (dim.width + dim.gap) * (ii % n);
				break;

			case 1: // Horizontal
				x = start_x + dx * (dim.width + dim.gap) * (ii % n);
				y = start_y - (dim.width + dim.gap) * Math.floor(ii / n);
				break;
			}
		} else {
			for (let k = 0; k <= dim.offset.length; ++k) {
				if (stack.length > dim.thresh[k]) {
					x += dx * dim.offset[k];
					y -= dim.offset[k];
					break;
				}
			}
		}
	}
}

function push_stack(stk, pc, elt) {
	stk.push([pc, elt]);
	elt.my_stack = stk;
}

function unshift_stack(stk, pc, elt) {
	stk.unshift([pc, elt]);
	elt.my_stack = stk;
}

function update_space(s) {
	let dim = style_dims[style];
	let space = spaces[s];
	let fstack = space.fstack;
	let bstack = space.bstack;

	fstack.length = 0;
	bstack.length = 0;

	let sx = space.x + Math.round(space.w/2) - 24;
	let sy = space.y + Math.round(space.h/2) - 24;
	if (space.type !== 'box' && space.type !== 'militia-box' && space.type !== 'leader-box')
		sy += 12; // make room for label
	if (space.type === 'leader-box')
		sy = space.y + space.h - 55;

	function marker(type) {
		if (view.british[type].includes(s))
			push_stack(bstack, 0, build_faction_marker(s, 'british', type));
		else
			destroy_faction_marker(s, 'british', type);
		if (view.french[type].includes(s))
			push_stack(fstack, 0, build_faction_marker(s, 'french', type));
		else
			destroy_faction_marker(s, 'french', type);
	}

	if (s in view.sieges) {
		if (view.british.fortresses.includes(s) || view.british.forts.includes(s))
			push_stack(bstack, 0, update_siege_marker(s, view.sieges[s]));
		else
			push_stack(fstack, 0, update_siege_marker(s, view.sieges[s]));
	} else {
		destroy_siege_marker(s);
	}

	marker("raids"); // TODO: more than one raid marker?

	for_each_piece_in_space(s, p => {
		if (view.location[p] >= 0) {
			let pe = pieces[p].element;
			pe.classList.remove('offmap');
			pe.classList.remove("inside");
			if (view.reduced.includes(p))
				pe.classList.add("reduced");
			else
				pe.classList.remove("reduced");
			if (pieces[p].faction === 'british')
				push_stack(bstack, p, pe);
			else
				push_stack(fstack, p, pe);
		}
	});

	marker("stockades");
	marker("forts");
	marker("forts_uc");
	marker("allied");

	for_each_piece_in_space(s, p => {
		if (view.location[p] < 0) {
			let pe = pieces[p].element;
			pe.classList.remove('offmap');
			pe.classList.add("inside");
			if (view.reduced.includes(p))
				pe.classList.add("reduced");
			else
				pe.classList.remove("reduced");
			if (pieces[p].faction === 'british')
				push_stack(bstack, p, pe);
			else
				push_stack(fstack, p, pe);
		}
	});

	if (view.amphib.includes(s))
		push_stack(bstack, 0, build_faction_marker(s, 'british', 'amphib'));
	else
		destroy_faction_marker(s, 'british', 'amphib');

	let fw = null;
	if (view.fieldworks.includes(s)) {
		fw = build_fieldworks_marker(s);
		fw.my_stack = null;
	} else {
		destroy_fieldworks_marker(s);
	}

	if (fstack.length > 0 && bstack.length > 0) {
		layout_stack(bstack, sx - 27, sy, -1);
		layout_stack(fstack, sx + 27, sy, 1);
		if (fw) {
			fw.style.left = (sx) + "px";
			fw.style.top = (sy - dim.width-5) + "px";
		}
	} else {
		if (fstack.length > 0) {
			if (fw) unshift_stack(fstack, 0, fw);
			layout_stack(fstack, sx, sy, 1);
		}
		if (bstack.length > 0) {
			if (fw) unshift_stack(bstack, 0, fw);
			layout_stack(bstack, sx, sy, -1);
		}
		if (fw && fstack.length === 0 && bstack.length === 0) {
			fw.style.left = sx + "px";
			fw.style.top = sy + "px";
		}
	}

	if (s >= first_leader_box && s <= last_leader_box) {
		let p = box_leader(s);
		space.element.classList.toggle("dead", is_leader_dead(p));
		space.element.classList.toggle("pool", is_leader_in_pool(p));
		space.element.classList.toggle("unavailable", is_leader_unavailable(p));
	}

	if (view.actions && view.actions.space && view.actions.space.includes(s))
		space.element.classList.add("highlight");
	else
		space.element.classList.remove("highlight");

	if (view.where === s)
		space.element.classList.add("selected");
	else
		space.element.classList.remove("selected");
}

function update_card(id) {
	let card = cards[id];
	if (is_card_enabled(id))
		card.element.classList.add('enabled');
	else
		card.element.classList.remove('enabled');
	if (view.hand.includes(id))
		card.element.classList.add("show");
	else
		card.element.classList.remove("show");
}

function update_piece(id) {
	let piece = pieces[id];
	if (view.actions && view.actions.piece && view.actions.piece.includes(id))
		piece.element.classList.add('highlight');
	else
		piece.element.classList.remove('highlight');
	if (view.activation && view.activation.includes(id))
		piece.element.classList.add('activated');
	else
		piece.element.classList.remove('activated');
	if (view.who === id)
		piece.element.classList.add('selected');
	else
		piece.element.classList.remove('selected');
}

function event_marker(e) {
	let element = document.getElementById("event_" + e);
	if (view.events[e])
		element.classList.add("show");
	else
		element.classList.remove("show");
}

function toggle_marker(id, show) {
	let element = document.getElementById(id);
	if (show)
		element.classList.add("show");
	else
		element.classList.remove("show");
}

function update_map() {
	if (!view)
		return;

	// Hide Dead and unused pieces
	for_each_piece_in_space(0, p => pieces[p].element.classList.add('offmap'));

	for (let i = 1; i < cards.length; ++i)
		update_card(i);
	for (let i = 1; i < spaces.length; ++i)
		update_space(i, false);
	for (let i = 0; i < pieces.length; ++i)
		update_piece(i);

	if (focus && focus.length === 0)
		focus = null;

	if (focus === null || layout > 1)
		focus_box.className = "hide";
	else
		focus_box.className = "show";

	ui.last_card.className = "card show card_" + view.last_card;

	let sm = document.getElementById("season_marker");
	if (view.events.quiberon) {
		if (view.season === EARLY)
			sm.className = SEASON_MARKER_BF + "early year_" + view.year;
		else
			sm.className = SEASON_MARKER_BF + "late year_" + view.year;
	} else {
		if (view.season === EARLY)
			sm.className = SEASON_MARKER_FF + "early year_" + view.year;
		else
			sm.className = SEASON_MARKER_FF + "late year_" + view.year;
	}

	let vpm = document.getElementById("vp_marker");
	if (view.vp > 10)
		vpm.className = VP_MARKER + "flip french_vp_" + (view.vp-10);
	else if (view.vp > 0)
		vpm.className = VP_MARKER + "french_vp_" + view.vp;
	else if (view.vp < -10)
		vpm.className = VP_MARKER + "flip british_vp_" + (-(view.vp+10));
	else if (view.vp < 0)
		vpm.className = VP_MARKER + "british_vp_" + (-view.vp);
	else
		vpm.className = VP_MARKER + "vp_0";

	let pam = document.getElementById("pa_marker");
	switch (view.pa) {
	case RELUCTANT: pam.className = PA_MARKER + "reluctant"; break;
	case SUPPORTIVE: pam.className = PA_MARKER + "supportive"; break;
	case ENTHUSIASTIC: pam.className = PA_MARKER + "enthusiastic"; break;
	}

	document.getElementById("british_hand").textContent = view.british.hand;
	document.getElementById("french_hand").textContent = view.french.hand;

	toggle_marker("british_card_held", view.british.held);
	toggle_marker("french_card_held", view.french.held);
	event_marker("pitt");
	event_marker("diplo");
	event_marker("quiberon");
	event_marker("no_fr_naval");
	event_marker("no_amphib");
	event_marker("cherokees");
	event_marker("cherokee_uprising");
	toggle_marker("event_british_blockhouses", view.events.blockhouses === 'Britain');
	toggle_marker("event_french_blockhouses", view.events.blockhouses === 'France');

	let demo_fort = view.actions && "demolish_fort" in view.actions;
	let demo_stockade = view.actions && "demolish_stockade" in view.actions;
	let demo_fieldworks = view.actions && "demolish_fieldworks" in view.actions;
	if (demo_fort || demo_stockade || demo_fieldworks) {
		document.getElementById("demolish_menu").classList.remove("hide");
		document.getElementById("demolish_fort").classList.toggle("hide", !demo_fort);
		document.getElementById("demolish_stockade").classList.toggle("hide", !demo_stockade);
		document.getElementById("demolish_fieldworks").classList.toggle("hide", !demo_fieldworks);
	} else {
		document.getElementById("demolish_menu").classList.add("hide");
	}

	action_button("restore", "Restore");
	action_button("northern", "Northern");
	action_button("southern", "Southern");
	action_button("siege", "Siege");
	action_button("assault", "Assault");
	action_button("move", "Move");
	action_button("naval_move", "Naval");
	action_button("boat_move", "Boat");
	action_button("land_move", "Land");
	action_button("eliminate", "Eliminate");
	action_button("pick_up_all", "Pick up all");
	action_button("exchange", "Exchange");
	action_button("stop", "Stop");
	action_button("pass", "Pass");
	action_button("next", "Next");
	action_button("undo", "Undo");
}

function on_update() {
	hide_supply();
	update_map();
}

// INITIALIZE CLIENT

drag_element_with_mouse("#removed", "#removed_header");
drag_element_with_mouse("#discard", "#discard_header");
scroll_with_middle_mouse("main");
