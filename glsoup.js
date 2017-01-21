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

	var frameandrequestframe = function() {
		if(canvas.width != canvas.clientWidth || canvas.height != canvas.clientHeight) {
			canvas.width = canvas.clientWidth;
			canvas.height = canvas.clientHeight;
			gl.viewport(0, 0, canvas.width, canvas.height);

			if(typeof onviewportchange === "function") {
				onviewportchange(canvas.width, canvas.height);
			}
		}

		frame();
		raf(frameandrequestframe);
	};

	raf(frameandrequestframe);
};

