var gl;
var canvas;
var phongProg, gouraudProg;
var indexCount = 0;

var eye = [0, 0, 4.5];
var objAngle = 0;
var lightAngle = 0;
var lastTime = 0;

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
    gl.bindAttribLocation(prog, 0, "aPosition");
    gl.bindAttribLocation(prog, 1, "aNormal");
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        alert("Помилка лінкування програми: " + gl.getProgramInfoLog(prog));
        return null;
    }
    return prog;
}

function makeTorus(R, r, segU, segV) {
    var positions = [];
    var normals = [];
    var indices = [];

    for (var i = 0; i <= segU; i++) {
        var u = 2 * Math.PI * i / segU;
        for (var j = 0; j <= segV; j++) {
            var v = 2 * Math.PI * j / segV;
            var x = (R + r * Math.cos(v)) * Math.cos(u);
            var y = r * Math.sin(v);
            var z = (R + r * Math.cos(v)) * Math.sin(u);
            positions.push(x, y, z);
            normals.push(Math.cos(v) * Math.cos(u), Math.sin(v), Math.cos(v) * Math.sin(u));
        }
    }

    for (var i = 0; i < segU; i++) {
        for (var j = 0; j < segV; j++) {
            var a = i * (segV + 1) + j;
            var b = (i + 1) * (segV + 1) + j;
            indices.push(a, b, a + 1);
            indices.push(b, b + 1, a + 1);
        }
    }

    return { positions: positions, normals: normals, indices: indices };
}

function initBuffer(data, loc, size) {
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(loc);
}

function val(id) {
    return parseFloat(document.getElementById(id).value);
}

function colorFromSelect(id) {
    return document.getElementById(id).value.split(",").map(parseFloat);
}

function updateLabels() {
    var ids = ["lx", "ly", "lz", "power", "kAtt", "ka", "kd", "ks", "shin"];
    for (var i = 0; i < ids.length; i++) {
        document.getElementById(ids[i] + "Val").innerHTML = document.getElementById(ids[i]).value;
    }
}

function setUniforms(prog, model, view, projection, lightPos) {
    function u(name) { return gl.getUniformLocation(prog, name); }

    gl.uniformMatrix4fv(u("uModel"), false, new Float32Array(model));
    gl.uniformMatrix4fv(u("uView"), false, new Float32Array(view));
    gl.uniformMatrix4fv(u("uProjection"), false, new Float32Array(projection));

    gl.uniform3fv(u("uLightPos"), lightPos);
    gl.uniform3fv(u("uLightColor"), colorFromSelect("lightColor"));
    gl.uniform1f(u("uLightPower"), val("power"));
    gl.uniform3f(u("uAmbient"), 1.0, 1.0, 1.0);
    gl.uniform3fv(u("uViewPos"), eye);
    gl.uniform3fv(u("uObjectColor"), colorFromSelect("objColor"));
    gl.uniform1f(u("uKa"), val("ka"));
    gl.uniform1f(u("uKd"), val("kd"));
    gl.uniform1f(u("uKs"), val("ks"));
    gl.uniform1f(u("uShininess"), val("shin"));
    gl.uniform1i(u("uUseAtten"), document.getElementById("atten").checked ? 1 : 0);
    gl.uniform1f(u("uK"), val("kAtt"));
}

function render(now) {
    now = now * 0.001;
    var dt = now - lastTime;
    lastTime = now;

    if (document.getElementById("rotateObj").checked) {
        objAngle += 0.5 * dt;
    }
    if (document.getElementById("rotateLight").checked) {
        lightAngle += 1.0 * dt;
    }

    var lx = val("lx"), ly = val("ly"), lz = val("lz");
    var c = Math.cos(lightAngle), s = Math.sin(lightAngle);
    var lightPos = [lx * c + lz * s, ly, -lx * s + lz * c];

    var model = mat4Multiply(mat4RotationX(degToRad(40)), mat4RotationY(degToRad(20) + objAngle));
    var view = mat4Translation(-eye[0], -eye[1], -eye[2]);
    var projection = mat4Perspective(45, canvas.width / canvas.height, 0.1, 100);

    var prog = (document.getElementById("shading").value == "phong") ? phongProg : gouraudProg;
    gl.useProgram(prog);
    setUniforms(prog, model, view, projection, lightPos);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);

    updateLabels();
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
    gl.clearColor(0.75, 0.87, 0.95, 1.0);
    gl.enable(gl.DEPTH_TEST);

    phongProg = createProgram("phong-vs", "phong-fs");
    gouraudProg = createProgram("gouraud-vs", "gouraud-fs");

    var torus = makeTorus(1.0, 0.4, 32, 12);
    initBuffer(torus.positions, 0, 3);
    initBuffer(torus.normals, 1, 3);
    indexCount = torus.indices.length;

    var ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(torus.indices), gl.STATIC_DRAW);

    requestAnimationFrame(function (t) {
        lastTime = t * 0.001;
        render(t);
    });
};
