var gl;
var canvas;
var vbo;
var points = [];

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

    var x = 2 * px / canvas.width - 1;
    var y = 1 - 2 * py / canvas.height;
    return [x, y];
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (points.length == 0) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
    gl.drawArrays(gl.POINTS, 0, points.length / 2);
}

window.onload = function () {
    canvas = document.getElementById("glcanvas");
    gl = setupWebGL(canvas);
    if (!gl) {
        alert("WebGL не підтримується");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.12, 0.12, 0.2, 1.0);

    var program = createProgram(document.getElementById("vertex-shader").text,
                                document.getElementById("fragment-shader").text);
    gl.useProgram(program);

    vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

    var aPosition = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);

    canvas.addEventListener("mousedown", function (event) {
        var p = getGLCoords(event);
        points.push(p[0], p[1]);
        document.getElementById("info").innerHTML =
            "Точок: " + points.length / 2 + ", остання: (" +
            p[0].toFixed(2) + "; " + p[1].toFixed(2) + ")";
        render();
    });

    render();
};
