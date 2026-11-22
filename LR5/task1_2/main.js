var gl;
var canvas;
var program;

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
    var colors = [];
    var indices = [];

    for (var i = 0; i <= segU; i++) {
        var u = 2 * Math.PI * i / segU;
        for (var j = 0; j <= segV; j++) {
            var v = 2 * Math.PI * j / segV;
            var x = (R + r * Math.cos(v)) * Math.cos(u);
            var y = r * Math.sin(v);
            var z = (R + r * Math.cos(v)) * Math.sin(u);
            positions.push(x, y, z);

            var k = 0.5 + 0.5 * Math.cos(v);
            colors.push(0.3 + 0.6 * k, 0.15 + 0.35 * k, 0.6 - 0.3 * k);
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

    return { positions: positions, colors: colors, indices: indices };
}

function initBuffer(data, attrName, size) {
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(program, attrName);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(loc);
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

    var torus = makeTorus(1.0, 0.4, 48, 24);
    initBuffer(torus.positions, "aPosition", 3);
    initBuffer(torus.colors, "aColor", 3);

    var ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(torus.indices), gl.STATIC_DRAW);

    var model = mat4Multiply(mat4RotationX(degToRad(40)), mat4RotationY(degToRad(20)));
    var view = mat4Translation(0, 0, -4.5);
    var projection = mat4Perspective(45, canvas.width / canvas.height, 0.1, 100);

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uModel"), false, new Float32Array(model));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uView"), false, new Float32Array(view));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uProjection"), false, new Float32Array(projection));

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, torus.indices.length, gl.UNSIGNED_SHORT, 0);
};
