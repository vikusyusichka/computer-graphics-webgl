var gl;
var program;
var uOffsetY;
var vertexCount = 0;

var amplitude = 0.45;
var period = 3.0;

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

function makeStar(rOut, rIn, n) {
    var data = [];
    data.push(0.0, 0.0, 1.0, 1.0, 0.3);

    for (var i = 0; i <= n * 2; i++) {
        var a = Math.PI / 2 + i * Math.PI / n;
        var r = (i % 2 == 0) ? rOut : rIn;
        var x = r * Math.cos(a);
        var y = r * Math.sin(a);
        if (i % 2 == 0) {
            data.push(x, y, 1.0, 0.4, 0.0);
        } else {
            data.push(x, y, 0.9, 0.1, 0.1);
        }
    }
    return data;
}

function render(now) {
    var t = now * 0.001;
    var offset = amplitude * Math.sin(2 * Math.PI * t / period);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uOffsetY, offset);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, vertexCount);

    requestAnimationFrame(render);
}

window.onload = function () {
    var canvas = document.getElementById("glcanvas");
    gl = setupWebGL(canvas);
    if (!gl) {
        alert("WebGL не підтримується");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.05, 0.1, 0.25, 1.0);

    program = createProgram(document.getElementById("vertex-shader").text,
                            document.getElementById("fragment-shader").text);
    gl.useProgram(program);

    var vertices = makeStar(0.4, 0.17, 5);
    vertexCount = vertices.length / 5;

    var vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    var FSIZE = Float32Array.BYTES_PER_ELEMENT;

    var aPosition = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 5 * FSIZE, 0);
    gl.enableVertexAttribArray(aPosition);

    var aColor = gl.getAttribLocation(program, "aColor");
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 5 * FSIZE, 2 * FSIZE);
    gl.enableVertexAttribArray(aColor);

    uOffsetY = gl.getUniformLocation(program, "uOffsetY");
    var uAspect = gl.getUniformLocation(program, "uAspect");
    gl.uniform1f(uAspect, canvas.width / canvas.height);

    requestAnimationFrame(render);
};
