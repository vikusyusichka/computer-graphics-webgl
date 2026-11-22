var gl;

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

    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        alert("Помилка лінкування програми: " + gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}

window.onload = function () {
    var canvas = document.getElementById("glcanvas");
    gl = setupWebGL(canvas);
    if (!gl) {
        alert("WebGL не підтримується");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.15, 0.15, 0.15, 1.0);

    var vsText = document.getElementById("vertex-shader").text;
    var fsText = document.getElementById("fragment-shader").text;
    var program = createProgram(vsText, fsText);
    gl.useProgram(program);

    var vertices = [
         0.0,  0.7,   1.0, 0.0, 0.0,
        -0.6, -0.5,   0.0, 1.0, 0.0,
         0.6, -0.5,   0.0, 0.0, 1.0
    ];

    var vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    var FSIZE = Float32Array.BYTES_PER_ELEMENT;
    var stride = 5 * FSIZE;

    var aPosition = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aPosition);

    var aColor = gl.getAttribLocation(program, "aColor");
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, stride, 2 * FSIZE);
    gl.enableVertexAttribArray(aColor);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
};
