var gl;
var program;
var uAngle;
var angle = 0.0;
var lastTime = 0;
var speed = 1.2;

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

function render(now) {
    now = now * 0.001;
    var delta = now - lastTime;
    lastTime = now;

    angle += speed * delta;

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uAngle, angle);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

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
    gl.clearColor(0.95, 0.95, 0.85, 1.0);

    program = createProgram(document.getElementById("vertex-shader").text,
                            document.getElementById("fragment-shader").text);
    gl.useProgram(program);

    var vertices = [
        -0.4,  0.4,   1.0, 0.2, 0.2,
        -0.4, -0.4,   0.2, 0.8, 0.2,
         0.4, -0.4,   0.2, 0.3, 1.0,
        -0.4,  0.4,   1.0, 0.2, 0.2,
         0.4, -0.4,   0.2, 0.3, 1.0,
         0.4,  0.4,   1.0, 0.9, 0.1
    ];

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

    uAngle = gl.getUniformLocation(program, "uAngle");
    var uAspect = gl.getUniformLocation(program, "uAspect");
    gl.uniform1f(uAspect, canvas.width / canvas.height);

    requestAnimationFrame(function (t) {
        lastTime = t * 0.001;
        render(t);
    });
};
