/* This program is free software. It comes without any warranty, to
 * the extent permitted by applicable law. You can redistribute it
 * and/or modify it under the terms of the Do What The Fuck You Want
 * To Public License, Version 2, as published by Sam Hocevar. See
 * http://sam.zoy.org/wtfpl/COPYING for more details. */

/* @author Romain "Artefact2" Dalmaso <artefact2@gmail.com> */





/* The functions below are not meant to be a complete full-blown
 * library. Just a modest attempt to reduce the amount of boilerplate
 * code required on fresh demos. */





/* Try and create a WebGL context from a given canvas.
 *
 * @param canvas a canvas DOM element
 *
 * @returns false or a WebGL context.
 */
create_context = function(canvas) {
	var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

	if(!gl) {
		console.log('WebGL unavailable.');
		return false;
	}

	return gl;
};





/* Try and create a WebGL program from a vertex/fragment shader
 * source.
 *
 * @param gl WebGL context
 *
 * @param vs_src vertex shader source
 *
 * @param fs_src fragment shader source
 *
 * @returns false or an array of references [ program, vs, fs
 * ].
 */
create_program_vf = function(gl, vs_src, fs_src) {
	var vs = gl.createShader(gl.VERTEX_SHADER);
	var fs = gl.createShader(gl.FRAGMENT_SHADER);

	gl.shaderSource(vs, vs_src);
	gl.shaderSource(fs, fs_src);

	gl.compileShader(vs);
	gl.compileShader(fs);

	if(!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
		console.log("Vertex shader compilation failed", gl.getShaderInfoLog(vs));
		return false;
	}

	if(!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
		console.log("Fragment shader shader compilation failed", gl.getShaderInfoLog(fs));
		return false;
	}

	var program = gl.createProgram();
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);

	if(!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.log("Program linkage failed", gl.getProgramInfoLog(program));
		return false;
	}

	return [ program, vs, fs ];
};





/* Start the animation.
 *
 * @param gl WebGL context
 * 
 * @param canvas the canvas DOM element
 * 
 * @param frame a function that takes no parameters and draws a frame
 * 
 * @param onviewportchange a function that takes the new width and new
 * height as parameters and is called when the viewport size changed.
 */
animate = function(gl, canvas, frame, onviewportchange) {
	var raf = requestAnimationFrame;

	if(typeof raf !== "function") {
		console.log('requestAnimationFrame not available, using shim');

		var idealdelay = 1000.0 / 60.0;
		var nf = new Date().getTime();

		raf = function(func) {
			var t = new Date().getTime();
			setTimeout(function() {
				func();
				nf += idealdelay;
			}, Math.max(0, nf - t));
		};
	}

	if(typeof onviewportchange === "function") {
		$(canvas).on('viewportchange', function() {
			var t = $(this)[0];
			onviewportchange(t.width, t.height);
		});
	}

	var frameandrequestframe = function() {
		var res = canvas.res === undefined ? 1 : canvas.res;
		var cw = Math.floor(canvas.clientWidth / res);
		var ch = Math.floor(canvas.clientHeight / res);
		
		if(canvas.width !== cw || canvas.height !== ch || canvas.res !== canvas.prevRes) {
			canvas.width = cw;
			canvas.height = ch;
			gl.viewport(0, 0, cw, ch);

			if(typeof onviewportchange === "function") {
				onviewportchange(canvas.width, canvas.height);
			}
		}

		frame();
		raf(frameandrequestframe);
	};

	raf(frameandrequestframe);
};





/* Process and normalize a set of given triangle coordinates:
 *
 * Center object around origin;
 * Normalize points in bounding sphere of diameter 1;
 * Add normal coordinates and barycentric coordinates. */
normalize_faces = function(va) {
	var i, len = va.length;
	if(len === 0) return [];

	var sX = 0, sY = 0, sZ = 0;

	for(i = 0; i < len; i += 3) {
		sX += va[i];
		sY += va[i+1];
		sZ += va[i+2];
	}

	sX *= 3 / i;
	sY *= 3 / i;
	sZ *= 3 / i;

	var m = 0;

	for(i = 0; i < len; i += 3) {
		va[i] -= sX;
		va[i+1] -= sY;
		va[i+2] -= sZ;

		m = Math.max(m, Math.abs(va[i]), Math.abs(va[i+1]), Math.abs(va[i+2]));
	}

	for(i = 0; i < len; i += 3) {
		va[i]   /= 2.0 * m;
		va[i+1] /= 2.0 * m;
		va[i+2] /= 2.0 * m;
	}

	var j, ret = [], u, v, n = vec3.create();
	var bc = [
		1.0, 0.0, 0.0,
		0.0, 1.0, 0.0,
		0.0, 0.0, 1.0,
	];

	for(i = 0; i < len; i += 9) {
		u = vec3.fromValues(va[i+3] - va[i], va[i+4] - va[i+1], va[i+5] - va[i+2]);
		v = vec3.fromValues(va[i+6] - va[i], va[i+7] - va[i+1], va[i+8] - va[i+2]);
		vec3.cross(n, u, v);
		vec3.normalize(n, n);

		for(j = 0; j < 9; j += 3) {
			ret.push(
				va[i+j], va[i+j+1], va[i+j+2],
				n[0], n[1], n[2],
				bc[j], bc[j+1], bc[j+2]
			);
		}
	}
	
	return ret;
};





menu_entries = {}; /* XXX: put/restore value from window.location.hash */
menu_hashvals = {};

var parts = window.location.hash.substring(1).split(';');
for(var i in parts) {
	var part = parts[i];
	part = part.split('=');
	menu_hashvals[part[0]] = parseFloat(part[1]);
}

menu_update_hash = function() {
	var vals = [];

	for(var id in menu_entries) {
		vals.push(id + "=" + menu_entries[id].find('div.payload').data('value'));
	}

	window.location.hash = "#" + vals.sort().join(';');
};

add_menu_entry_generic = function(id, payload) {
	var menu = $("ul#menu");
	if(menu.length === 0) {
		menu = $(document.createElement('ul'));
		menu.prop('id', 'menu');
		$("body").append(menu);
	}

	if(id in menu_entries) {
		remove_menu_entry(id);
	}

	var li = menu_entries[id] = $(document.createElement('li'));
	li.append($(document.createElement('label')).text(id));
	li.append(payload);
	menu.append(li);

	if(Object.keys(menu_entries).length === 1) {
		add_shortcut("m", "toggle menu", function() {
			menu.toggle();
		});
	}
};

/* opts: min, max, step, init, onchange(oldval, newval), log? */
add_menu_entry_range = function(id, opts) {
	opts.min = opts.min === undefined ? 0 : opts.min;
	opts.max = opts.max === undefined ? 1 : opts.max;
	opts.step = opts.step === undefined ? "any" : opts.step;
	opts.init = opts.init === undefined ? .5 : opts.init;
	opts.onchange = opts.onchange === undefined ? function() {} : opts.onchange;
	opts.log = opts.log === undefined ? false : opts.log;

	if(opts.log) {
		var f = opts.onchange;
		opts.onchange = function(oldv, newv) {
			f(Math.exp(oldv), Math.exp(newv));
		};
		opts.min = Math.log(opts.min);
		opts.max = Math.log(opts.max);
		opts.init = Math.log(opts.init);
		opts.step = "any";
	}
	
	var payload = $(document.createElement('div')).addClass('payload').addClass('range');
	var irange = $(document.createElement('input'))
		.prop('type', 'range')
		.prop('min', opts.min)
		.prop('max', opts.max)
		.prop('step', opts.step)
		.val(opts.init)
	;
	var inumber = $(document.createElement('input'))
		.prop('type', 'number')
		.prop('min', opts.min)
		.prop('max', opts.max)
		.prop('step', opts.step === "any" ? (opts.max - opts.min) / 1000.0 : opts.step)
		.val(opts.init)
	;

	payload.data('value', opts.init);
	irange.val(opts.init);
	inumber.val(opts.init);

	payload.on('change input', 'input', function() {
		var t = $(this);
		var p = t.parent();

		if(p.data('value') === t.val()) return;
		if(t.val() === '') return;

		opts.onchange(parseFloat(p.data('value')), parseFloat(t.val()));
		
		p.children('input').val(t.val());
		p.data('value', t.val());
	});

	payload.append(irange, inumber);
	add_menu_entry_generic(id, payload);

	if(id in menu_hashvals) {
		inumber.val(menu_hashvals[id]).trigger('change');
	}
};

remove_menu_entry = function(id) {
	if(!(id in menu_entries)) return;
	menu_entries[id].remove();
	delete menu_entries[id];

	if(Object.keys(menu_entries).length === 0) {
		$("ul#menu").hide();
		remove_shortcut("m");
	}
};




shortcuts = {};
if(typeof(Mousetrap) === 'undefined') Mousetrap = { bind: function() {}, unbind: function() {} };

add_shortcut = function(key, label, callback) {
	var slist = $("ul#shortcuts");
	if(slist.length === 0) {
		slist = $(document.createElement('ul'));
		slist.prop('id', 'shortcuts');
		$("body").append(slist);
		slist.hide();
	}

	if(key in shortcuts) {
		remove_shortcut(key);
	}

	Mousetrap.bind(key, function() {
		callback();
		return false;
	});

	var li = shortcuts[key] = $(document.createElement('li'));
	li.text(key + ': ' + label);
	slist.append(li);

	if(Object.keys(shortcuts).length === 3) {
		slist.show();
	}
};

remove_shortcut = function(key) {
	if(!(key in shortcuts)) return;
	Mousetrap.unbind(key);
	shortcuts[key].remove();
	delete shortcuts[key];

	if(Object.keys(shortcuts).length === 1) {
		$("ul#shortcuts").hide();
	}
};

$(function() {
	add_shortcut("s", "toggle shortcuts", function() {
		$("ul#shortcuts").toggle();
	});

	add_shortcut("p", "generate permalink", menu_update_hash);
});
