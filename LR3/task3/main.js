var gl;
var canvas;
var program;
var indexCount = 0;

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

function initCube() {
    var faces = [
        { v: [-1,-1, 1,   1,-1, 1,   1, 1, 1,  -1, 1, 1], c: [0.9, 0.2, 0.2] },
        { v: [ 1,-1,-1,  -1,-1,-1,  -1, 1,-1,   1, 1,-1], c: [0.2, 0.7, 0.3] },
        { v: [-1, 1, 1,   1, 1, 1,   1, 1,-1,  -1, 1,-1], c: [0.2, 0.4, 0.9] },
        { v: [-1,-1,-1,   1,-1,-1,   1,-1, 1,  -1,-1, 1], c: [0.95, 0.8, 0.1] },
        { v: [ 1,-1, 1,   1,-1,-1,   1, 1,-1,   1, 1, 1], c: [0.6, 0.2, 0.8] },
        { v: [-1,-1,-1,  -1,-1, 1,  -1, 1, 1,  -1, 1,-1], c: [1.0, 0.5, 0.1] }
    ];

    var data = [];
    var indices = [];

    for (var f = 0; f < faces.length; f++) {
        for (var i = 0; i < 4; i++) {
            data.push(faces[f].v[i * 3], faces[f].v[i * 3 + 1], faces[f].v[i * 3 + 2]);
            data.push(faces[f].c[0], faces[f].c[1], faces[f].c[2]);
        }
        var s = f * 4;
        indices.push(s, s + 1, s + 2,  s, s + 2, s + 3);
    }

    var vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

    var ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    var FSIZE = Float32Array.BYTES_PER_ELEMENT;
    var aPosition = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 6 * FSIZE, 0);
    gl.enableVertexAttribArray(aPosition);

    var aColor = gl.getAttribLocation(program, "aColor");
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 6 * FSIZE, 3 * FSIZE);
    gl.enableVertexAttribArray(aColor);

    return indices.length;
}

function getProjection() {
    var aspect = canvas.width / canvas.height;
    var checked = document.querySelector("input[name=proj]:checked").value;
    if (checked == "ortho") {
        var size = 2.3;
        return mat4Ortho(-size * aspect, size * aspect, -size, size, 0.1, 100);
    }
    return mat4Perspective(50, aspect, 0.1, 100);
}

function draw() {
    var model = mat4Multiply(mat4RotationX(degToRad(25)), mat4RotationY(degToRad(-35)));
    var view = mat4Translation(0, 0, -5);

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uModel"), false, new Float32Array(model));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uView"), false, new Float32Array(view));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uProjection"), false, new Float32Array(getProjection()));

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
}

window.onload = function () {
    canvas = document.getElementById("glcanvas");
    gl = setupWebGL(canvas);
    if (!gl) {
        alert("WebGL не підтримується");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.97, 0.97, 0.97, 1.0);
    gl.enable(gl.DEPTH_TEST);

    program = createProgram(document.getElementById("vertex-shader").text,
                            document.getElementById("fragment-shader").text);
    gl.useProgram(program);

    indexCount = initCube();

    var radios = document.querySelectorAll("input[name=proj]");
    for (var i = 0; i < radios.length; i++) {
        radios[i].addEventListener("change", draw);
    }

    draw();
};
