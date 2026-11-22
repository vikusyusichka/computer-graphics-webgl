var gl;
var canvas;
var program;
var loc = {};
var letters = [];
var time = 0;
var lastTime = 0;

var DEPTH = 0.35;
var BAR = 0.2;

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

function createProgram(vsText, fsText) {
    var vs = createShader(gl.VERTEX_SHADER, vsText);
    var fs = createShader(gl.FRAGMENT_SHADER, fsText);

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

var pos = [];
var nrm = [];
var hgt = [];

function pushTri(a, b, c, n) {
    var pts = [a, b, c];
    for (var i = 0; i < 3; i++) {
        pos.push(pts[i][0], pts[i][1], pts[i][2]);
        nrm.push(n[0], n[1], n[2]);
        hgt.push((pts[i][1] + 1) / 2);
    }
}

function faceNormal(a, b, c) {
    var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    var vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    var len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    return [nx / len, ny / len, nz / len];
}

function addQuad(p0, p1, p2, p3, walls) {
    walls = walls || [true, true, true, true];
    var z = DEPTH / 2;
    var f = [[p0[0], p0[1], z], [p1[0], p1[1], z], [p2[0], p2[1], z], [p3[0], p3[1], z]];
    var b = [[p0[0], p0[1], -z], [p1[0], p1[1], -z], [p2[0], p2[1], -z], [p3[0], p3[1], -z]];

    pushTri(f[0], f[1], f[2], [0, 0, 1]);
    pushTri(f[0], f[2], f[3], [0, 0, 1]);
    pushTri(b[0], b[2], b[1], [0, 0, -1]);
    pushTri(b[0], b[3], b[2], [0, 0, -1]);
    for (var i = 0; i < 4; i++) {
        if (!walls[i]) continue;
        var j = (i + 1) % 4;
        var n = faceNormal(f[i], b[i], b[j]);
        pushTri(f[i], b[i], b[j], n);
        pushTri(f[i], b[j], f[j], n);
    }
}

function addRect(x1, y1, x2, y2) {
    addQuad([x1, y1], [x2, y1], [x2, y2], [x1, y2]);
}

function addArc(cx, cy, rx, ry, a0, a1, n) {
    for (var i = 0; i < n; i++) {
        var t0 = degToRad(a0 + (a1 - a0) * i / n);
        var t1 = degToRad(a0 + (a1 - a0) * (i + 1) / n);
        var o0 = [cx + rx * Math.cos(t0), cy + ry * Math.sin(t0)];
        var o1 = [cx + rx * Math.cos(t1), cy + ry * Math.sin(t1)];
        var i0 = [cx + (rx - BAR) * Math.cos(t0), cy + (ry - BAR) * Math.sin(t0)];
        var i1 = [cx + (rx - BAR) * Math.cos(t1), cy + (ry - BAR) * Math.sin(t1)];
        var full = Math.abs(a1 - a0) >= 360;
        var startWall = (i == 0) && !full;
        var endWall = (i == n - 1) && !full;
        addQuad(i0, o0, o1, i1, [startWall, true, endWall, true]);
    }
}

function letterF() {
    addRect(-0.1, -1, 0.1, 1);
    addArc(0, 0.12, 0.62, 0.5, 0, 360, 48);
}

function letterV() {
    addRect(-0.55, -1, -0.35, 1);
    addRect(-0.35, 0.8, 0.0, 1);
    addRect(-0.35, -0.1, 0.05, 0.1);
    addArc(0.0, 0.45, 0.45, 0.55, -90, 90, 24);
    addRect(-0.35, -1, 0.05, -0.8);
    addArc(0.05, -0.45, 0.52, 0.55, -90, 90, 24);
}

function letterB() {
    addRect(-0.55, -1, -0.35, 1);
    addRect(-0.35, 0.8, 0.5, 1);
    addRect(-0.35, 0.05, 0.05, 0.25);
    addRect(-0.35, -1, 0.05, -0.8);
    addArc(0.05, -0.375, 0.52, 0.625, -90, 90, 24);
}

function initLetters() {
    var builders = [letterF, letterV, letterB];
    for (var i = 0; i < builders.length; i++) {
        var first = pos.length / 3;
        builders[i]();
        letters.push({ first: first, count: pos.length / 3 - first });
    }

    initBuffer(pos, loc.a_Position, 3);
    initBuffer(nrm, loc.a_Normal, 3);
    initBuffer(hgt, loc.a_Height, 1);
}

function initBuffer(data, attribLoc, size) {
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    gl.vertexAttribPointer(attribLoc, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attribLoc);
}

function hexToRgb(hex) {
    return [parseInt(hex.substr(1, 2), 16) / 255,
            parseInt(hex.substr(3, 2), 16) / 255,
            parseInt(hex.substr(5, 2), 16) / 255];
}

function shiftHue(c, angle) {
    var cosA = Math.cos(angle), sinA = Math.sin(angle);
    var k = (1 - cosA) / 3, s = Math.sqrt(1 / 3) * sinA;
    var r = c[0] * (cosA + k) + c[1] * (k - s) + c[2] * (k + s);
    var g = c[0] * (k + s) + c[1] * (cosA + k) + c[2] * (k - s);
    var b = c[0] * (k - s) + c[1] * (k + s) + c[2] * (cosA + k);
    return [Math.min(Math.max(r, 0), 1), Math.min(Math.max(g, 0), 1), Math.min(Math.max(b, 0), 1)];
}

function letterMatrix(i, mode, t) {
    var x = (i - 1) * 1.9;
    var y = 0, angle = 0, tilt = 0, s = 1;
    var phase = i * 0.9;

    if (mode == "rotate") {
        angle = t * 1.2 + phase;
    } else if (mode == "wave") {
        y = 0.35 * Math.sin(t * 2.5 - phase);
        tilt = 0.25 * Math.cos(t * 2.5 - phase);
    } else if (mode == "pulse") {
        s = 1 + 0.18 * Math.sin(t * 3 - phase);
        angle = 0.35 * Math.sin(t);
    }

    var m = mat4Scaling(0.85 * s, 0.85 * s, 0.85 * s);
    m = mat4Multiply(mat4RotationY(angle), m);
    m = mat4Multiply(mat4RotationZ(tilt), m);
    m = mat4Multiply(mat4Translation(x, y, 0), m);
    return m;
}

function render(now) {
    now = now * 0.001;
    var dt = now - lastTime;
    lastTime = now;

    var speed = parseFloat(document.getElementById("speed").value);
    document.getElementById("speedVal").innerHTML = speed;
    time += dt * speed;
    var mode = document.getElementById("mode").value;

    var bg = hexToRgb(document.getElementById("bgColor").value);
    gl.clearColor(bg[0], bg[1], bg[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var view = mat4Multiply(mat4Translation(0, 0, -5), mat4RotationX(degToRad(12)));
    var proj = mat4Perspective(45, canvas.width / canvas.height, 0.1, 100);
    var pv = mat4Multiply(proj, view);

    var useGradient = document.getElementById("gradient").checked;
    var rainbow = document.getElementById("rainbow").checked;

    for (var i = 0; i < letters.length; i++) {
        var model = letterMatrix(i, mode, time);
        gl.uniformMatrix4fv(loc.u_Model, false, new Float32Array(model));
        gl.uniformMatrix4fv(loc.u_MVP, false, new Float32Array(mat4Multiply(pv, model)));

        var top = hexToRgb(document.getElementById("color" + i).value);
        if (rainbow) {
            top = shiftHue(top, time * 1.5 + i);
        }
        var bottom = useGradient ? [top[0] * 0.35, top[1] * 0.35, top[2] * 0.35] : top;
        gl.uniform3fv(loc.u_ColorTop, top);
        gl.uniform3fv(loc.u_ColorBottom, bottom);

        gl.drawArrays(gl.TRIANGLES, letters[i].first, letters[i].count);
    }

    requestAnimationFrame(render);
}

window.onload = function () {
    canvas = document.getElementById("glcanvas");
    gl = setupWebGL(canvas);
    if (!gl) {
        alert("WebGL не підтримується");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.DEPTH_TEST);

    program = createProgram(document.getElementById("vertex-shader").text,
                            document.getElementById("fragment-shader").text);
    gl.useProgram(program);

    loc.a_Position = gl.getAttribLocation(program, "a_Position");
    loc.a_Normal = gl.getAttribLocation(program, "a_Normal");
    loc.a_Height = gl.getAttribLocation(program, "a_Height");
    loc.u_MVP = gl.getUniformLocation(program, "u_MVP");
    loc.u_Model = gl.getUniformLocation(program, "u_Model");
    loc.u_ColorTop = gl.getUniformLocation(program, "u_ColorTop");
    loc.u_ColorBottom = gl.getUniformLocation(program, "u_ColorBottom");
    loc.u_LightDir = gl.getUniformLocation(program, "u_LightDir");

    gl.uniform3f(loc.u_LightDir, -0.4, 0.6, 1.0);

    initLetters();

    requestAnimationFrame(function (t) {
        lastTime = t * 0.001;
        render(t);
    });
};
