var gl;
var canvas;
var program;
var indexCount = 0;

var eye = [0, 0, 4.5];
var lightPos = [2.5, 3.0, 3.0];

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

function initBuffer(data, attrName, size) {
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(program, attrName);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(loc);
}

function uniform(name) {
    return gl.getUniformLocation(program, name);
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

    program = createProgram(document.getElementById("vertex-shader").text,
                            document.getElementById("fragment-shader").text);
    gl.useProgram(program);

    var torus = makeTorus(1.0, 0.4, 64, 32);
    initBuffer(torus.positions, "aPosition", 3);
    initBuffer(torus.normals, "aNormal", 3);
    indexCount = torus.indices.length;

    var ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(torus.indices), gl.STATIC_DRAW);

    var model = mat4Multiply(mat4RotationX(degToRad(40)), mat4RotationY(degToRad(20)));
    var view = mat4Translation(-eye[0], -eye[1], -eye[2]);
    var projection = mat4Perspective(45, canvas.width / canvas.height, 0.1, 100);

    gl.uniformMatrix4fv(uniform("uModel"), false, new Float32Array(model));
    gl.uniformMatrix4fv(uniform("uView"), false, new Float32Array(view));
    gl.uniformMatrix4fv(uniform("uProjection"), false, new Float32Array(projection));

    gl.uniform3fv(uniform("uLightPos"), lightPos);
    gl.uniform3f(uniform("uLightColor"), 1.0, 1.0, 1.0);
    gl.uniform3f(uniform("uAmbient"), 1.0, 1.0, 1.0);
    gl.uniform3fv(uniform("uViewPos"), eye);
    gl.uniform3f(uniform("uObjectColor"), 0.9, 0.45, 0.1);
    gl.uniform1f(uniform("uKa"), 0.2);
    gl.uniform1f(uniform("uKd"), 0.8);
    gl.uniform1f(uniform("uKs"), 0.6);
    gl.uniform1f(uniform("uShininess"), 32.0);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
};
