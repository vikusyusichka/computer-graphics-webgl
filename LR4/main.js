var gl;
var canvas;

var crate = {};
var lid = {};

var thetaX = 30;
var thetaY = 30;
var lidAngle = 0;
var STEP_Y = 10;
var STEP_LID = 10;
var MAX_LID = 120;

var xe = 0.0, ye = 0.0, ze = 4.5;

function setupWebGL(canvas) {
    var context = canvas.getContext("webgl");
    if (!context) {
        context = canvas.getContext("experimental-webgl");
    }
    return context;
}

function createShader(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert("Помилка компіляції шейдера: " + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(vsId, fsId) {
    var vs = createShader(gl.VERTEX_SHADER, document.getElementById(vsId).text);
    var fs = createShader(gl.FRAGMENT_SHADER, document.getElementById(fsId).text);

    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        alert("Помилка лінкування програми: " + gl.getProgramInfoLog(prog));
        return null;
    }
    return prog;
}

function makeCubeCoords() {
    var p = [
        [-0.5, -0.5,  0.5], [ 0.5, -0.5,  0.5], [ 0.5,  0.5,  0.5], [-0.5,  0.5,  0.5],
        [-0.5, -0.5, -0.5], [ 0.5, -0.5, -0.5], [ 0.5,  0.5, -0.5], [-0.5,  0.5, -0.5]
    ];
    var faces = [
        [0, 1, 2, 3],
        [5, 4, 7, 6],
        [3, 2, 6, 7],
        [4, 5, 1, 0],
        [1, 5, 6, 2],
        [4, 0, 3, 7]
    ];
    var out = [];
    for (var f = 0; f < 6; f++) {
        var q = faces[f];
        var order = [q[0], q[1], q[2], q[0], q[2], q[3]];
        for (var i = 0; i < 6; i++) {
            out.push(p[order[i]][0], p[order[i]][1], p[order[i]][2]);
        }
    }
    return out;
}

function makeFaceColors(faceColors) {
    var out = [];
    for (var f = 0; f < 6; f++) {
        for (var i = 0; i < 6; i++) {
            out.push(faceColors[f][0], faceColors[f][1], faceColors[f][2]);
        }
    }
    return out;
}

function rotate_X(theta, loc) {
    var a = theta * Math.PI / 180;
    var c = Math.cos(a), s = Math.sin(a);
    var m = new Float32Array([
        1, 0,  0, 0,
        0, c,  s, 0,
        0, -s, c, 0,
        0, 0,  0, 1
    ]);
    gl.uniformMatrix4fv(loc, false, m);
}

function rotate_Y(theta, loc) {
    var a = theta * Math.PI / 180;
    var c = Math.cos(a), s = Math.sin(a);
    var m = new Float32Array([
        c, 0, -s, 0,
        0, 1, 0,  0,
        s, 0, c,  0,
        0, 0, 0,  1
    ]);
    gl.uniformMatrix4fv(loc, false, m);
}

function scale(sx, sy, sz, loc) {
    var m = new Float32Array([
        sx, 0,  0,  0,
        0,  sy, 0,  0,
        0,  0,  sz, 0,
        0,  0,  0,  1
    ]);
    gl.uniformMatrix4fv(loc, false, m);
}

function translate(tx, ty, tz, loc) {
    var m = new Float32Array([
        1,  0,  0,  0,
        0,  1,  0,  0,
        0,  0,  1,  0,
        tx, ty, tz, 1
    ]);
    gl.uniformMatrix4fv(loc, false, m);
}

function perspective(aspect, fov, near, far, loc) {
    var pa = 1.0 / (aspect * Math.tan((fov / 2) * Math.PI / 180));
    var pb = 1.0 / Math.tan((fov / 2) * Math.PI / 180);
    var pc = -(far + near) / (far - near);
    var pd = -(2.0 * far * near) / (far - near);
    var m = new Float32Array([
        pa,  0.0, 0.0,  0.0,
        0.0, pb,  0.0,  0.0,
        0.0, 0.0, pc,  -1.0,
        0.0, 0.0, pd,   0.0
    ]);
    gl.uniformMatrix4fv(loc, false, m);
}

function camera_basis(loc) {
    var u = [1, 0, 0];
    var v = [0, 1, 0];
    var w = [0, 0, 1];
    var m = new Float32Array([
        u[0], v[0], w[0], 0,
        u[1], v[1], w[1], 0,
        u[2], v[2], w[2], 0,
        0,    0,    0,    1
    ]);
    gl.uniformMatrix4fv(loc, false, m);
}

function camera_eye(xe, ye, ze, loc) {
    var m = new Float32Array([
        1,   0,   0,   0,
        0,   1,   0,   0,
        0,   0,   1,   0,
        -xe, -ye, -ze, 1
    ]);
    gl.uniformMatrix4fv(loc, false, m);
}

function passAttribData(data, att_buffer, loc) {
    gl.bindBuffer(gl.ARRAY_BUFFER, att_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(loc);
}

function initGL_1() {
    crate.program = createProgram("crate-vs", "crate-fs");
    gl.useProgram(crate.program);

    crate.aCoords = gl.getAttribLocation(crate.program, "a_coords");
    crate.aColors = gl.getAttribLocation(crate.program, "a_colors");
    crate.coordBuffer = gl.createBuffer();
    crate.colorBuffer = gl.createBuffer();

    crate.uRotY = gl.getUniformLocation(crate.program, "u_RotY");
    crate.uRotX = gl.getUniformLocation(crate.program, "u_RotX");
    crate.uScale = gl.getUniformLocation(crate.program, "u_Scale");
    crate.uTrans = gl.getUniformLocation(crate.program, "u_Trans");
    crate.uBasis = gl.getUniformLocation(crate.program, "u_Basis");
    crate.uEye = gl.getUniformLocation(crate.program, "u_Eye");
    crate.uPers = gl.getUniformLocation(crate.program, "u_Pers");

    crate.coords = makeCubeCoords();
    crate.colors = makeFaceColors([
        [0.9, 0.1, 0.1],
        [0.1, 0.8, 0.1],
        [0.1, 0.1, 0.9],
        [0.95, 0.9, 0.1],
        [0.15, 0.15, 0.15],
        [0.1, 0.85, 0.85]
    ]);
    crate.count = crate.coords.length / 3;
}

function initGL_2() {
    lid.program = createProgram("lid-vs", "lid-fs");
    gl.useProgram(lid.program);

    lid.aCoords = gl.getAttribLocation(lid.program, "a_coords");
    lid.aColors = gl.getAttribLocation(lid.program, "a_colors");
    lid.coordBuffer = gl.createBuffer();
    lid.colorBuffer = gl.createBuffer();

    lid.uRotY = gl.getUniformLocation(lid.program, "u_RotY");
    lid.uRotX = gl.getUniformLocation(lid.program, "u_RotX");
    lid.uTrans = gl.getUniformLocation(lid.program, "u_Trans");
    lid.uBasis = gl.getUniformLocation(lid.program, "u_Basis");
    lid.uEye = gl.getUniformLocation(lid.program, "u_Eye");
    lid.uPers = gl.getUniformLocation(lid.program, "u_Pers");
    lid.uLidScale = gl.getUniformLocation(lid.program, "u_LidScale");
    lid.uLidOffset = gl.getUniformLocation(lid.program, "u_LidOffset");
    lid.uLidOpen = gl.getUniformLocation(lid.program, "u_LidOpen");
    lid.uLidHinge = gl.getUniformLocation(lid.program, "u_LidHinge");

    lid.coords = makeCubeCoords();
    lid.colors = makeFaceColors([
        [0.1, 0.55, 0.55],
        [0.1, 0.55, 0.55],
        [0.55, 0.55, 0.0],
        [0.6, 0.6, 1.0],
        [0.1, 0.55, 0.55],
        [0.1, 0.55, 0.55]
    ]);
    lid.count = lid.coords.length / 3;
}

function draw_crate() {
    gl.useProgram(crate.program);
    passAttribData(crate.coords, crate.coordBuffer, crate.aCoords);
    passAttribData(crate.colors, crate.colorBuffer, crate.aColors);

    rotate_X(thetaX, crate.uRotX);
    rotate_Y(thetaY, crate.uRotY);
    scale(1.0, 1.0, 1.0, crate.uScale);
    translate(0.0, -0.2, 0.0, crate.uTrans);

    camera_basis(crate.uBasis);
    camera_eye(xe, ye, ze, crate.uEye);
    perspective(canvas.width / canvas.height, 45, 1.0, 10.0, crate.uPers);

    gl.drawArrays(gl.TRIANGLES, 0, crate.count);
}

function draw_lid() {
    gl.useProgram(lid.program);
    passAttribData(lid.coords, lid.coordBuffer, lid.aCoords);
    passAttribData(lid.colors, lid.colorBuffer, lid.aColors);

    rotate_X(thetaX, lid.uRotX);
    rotate_Y(thetaY, lid.uRotY);
    translate(0.0, -0.2, 0.0, lid.uTrans);

    var t = 0.06;
    scale(1.04, t, 1.04, lid.uLidScale);
    translate(0.0, t / 2, 0.52, lid.uLidOffset);
    rotate_X(-lidAngle, lid.uLidOpen);
    translate(0.0, 0.5, -0.52, lid.uLidHinge);

    camera_basis(lid.uBasis);
    camera_eye(xe, ye, ze, lid.uEye);
    perspective(canvas.width / canvas.height, 45, 1.0, 10.0, lid.uPers);

    gl.drawArrays(gl.TRIANGLES, 0, lid.count);
}

function drawScene() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    draw_crate();
    draw_lid();
    document.getElementById("info").innerHTML =
        "Кут Y: " + thetaY + "°, кришка відкрита на " + lidAngle + "°";
}

function onKeyDown(event) {
    if (event.key == "ArrowLeft") {
        thetaY -= STEP_Y;
    } else if (event.key == "ArrowRight") {
        thetaY += STEP_Y;
    } else if (event.key == "ArrowUp") {
        lidAngle = Math.min(lidAngle + STEP_LID, MAX_LID);
    } else if (event.key == "ArrowDown") {
        lidAngle = Math.max(lidAngle - STEP_LID, 0);
    } else {
        return;
    }
    event.preventDefault();
    drawScene();
}

window.onload = function () {
    canvas = document.getElementById("glcanvas");
    gl = setupWebGL(canvas);
    if (!gl) {
        alert("WebGL не підтримується");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.88, 0.88, 0.88, 1.0);
    gl.enable(gl.DEPTH_TEST);

    initGL_1();
    initGL_2();

    window.addEventListener("keydown", onKeyDown);

    drawScene();
};
