var gl;
var canvas;
var vbo;

var vertices = [];
var pointIdx = [];
var triIdx = [];

var mode = "point";
var tempTri = [];

var pointColors = [
    [1.0, 0.85, 0.2],
    [0.9, 0.1, 0.1],
    [0.1, 0.75, 0.2],
    [0.15, 0.3, 0.95],
    [1.0, 1.0, 1.0],
    [0.0, 0.0, 0.0]
];

var bgColors = [
    [0.12, 0.12, 0.2],
    [1.0, 1.0, 1.0],
    [0.6, 0.6, 0.6],
    [0.8, 0.95, 0.8],
    [0.0, 0.0, 0.0]
];

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

function getGLCoords(event) {
    var rect = event.target.getBoundingClientRect();
    var px = event.clientX - rect.left;
    var py = event.clientY - rect.top;
    return [2 * px / canvas.width - 1, 1 - 2 * py / canvas.height];
}

function addVertex(x, y, c) {
    vertices.push(x, y, c[0], c[1], c[2]);
    return vertices.length / 5 - 1;
}

function removeFromArray(arr, value) {
    var i = arr.indexOf(value);
    if (i != -1) arr.splice(i, 1);
}

function copyVertex(dst, i) {
    for (var k = 0; k < 5; k++) {
        dst.push(vertices[i * 5 + k]);
    }
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    var data = [];
    var i;
    for (i = 0; i < pointIdx.length; i++) copyVertex(data, pointIdx[i]);
    for (i = 0; i < triIdx.length; i++) copyVertex(data, triIdx[i]);
    if (data.length == 0) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

    var offset = 0;
    if (pointIdx.length > 0) {
        gl.drawArrays(gl.POINTS, offset, pointIdx.length);
    }
    offset += pointIdx.length;

    if (triIdx.length > 0) {
        gl.drawArrays(gl.TRIANGLES, offset, triIdx.length);
    }
}

function onCanvasClick(event) {
    var p = getGLCoords(event);
    var c = pointColors[document.getElementById("pointColor").value];
    var idx;

    if (mode == "point") {
        idx = addVertex(p[0], p[1], c);
        pointIdx.push(idx);
    }
    else if (mode == "triangle") {
        idx = addVertex(p[0], p[1], c);
        pointIdx.push(idx);
        tempTri.push(idx);
        if (tempTri.length == 3) {
            for (var i = 0; i < 3; i++) {
                removeFromArray(pointIdx, tempTri[i]);
                triIdx.push(tempTri[i]);
            }
            tempTri = [];
        }
    }

    updateInfo();
    render();
}

function setMode(newMode) {
    mode = newMode;
    tempTri = [];

    document.getElementById("pointBtn").className = (mode == "point") ? "active" : "";
    document.getElementById("triBtn").className = (mode == "triangle") ? "active" : "";
    updateInfo();
}

function updateInfo() {
    document.getElementById("info").innerHTML =
        "Точок: " + pointIdx.length +
        " | Трикутників: " + triIdx.length / 3;
}

window.onload = function () {
    canvas = document.getElementById("glcanvas");
    gl = setupWebGL(canvas);
    if (!gl) {
        alert("WebGL не підтримується");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    var bg = bgColors[0];
    gl.clearColor(bg[0], bg[1], bg[2], 1.0);

    var program = createProgram(document.getElementById("vertex-shader").text,
                                document.getElementById("fragment-shader").text);
    gl.useProgram(program);

    vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

    var FSIZE = Float32Array.BYTES_PER_ELEMENT;
    var aPosition = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 5 * FSIZE, 0);
    gl.enableVertexAttribArray(aPosition);

    var aColor = gl.getAttribLocation(program, "aColor");
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 5 * FSIZE, 2 * FSIZE);
    gl.enableVertexAttribArray(aColor);

    canvas.addEventListener("mousedown", onCanvasClick);

    document.getElementById("pointBtn").addEventListener("click", function () { setMode("point"); });
    document.getElementById("triBtn").addEventListener("click", function () { setMode("triangle"); });

    document.getElementById("clearBtn").addEventListener("click", function () {
        var c = bgColors[document.getElementById("bgColor").value];
        gl.clearColor(c[0], c[1], c[2], 1.0);
        vertices = [];
        pointIdx = [];
        triIdx = [];
        tempTri = [];
        updateInfo();
        render();
    });

    updateInfo();
    render();
};
