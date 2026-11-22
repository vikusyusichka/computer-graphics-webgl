var gl;
var canvas;

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

window.onload = function () {
    canvas = document.getElementById("glcanvas");
    gl = setupWebGL(canvas);
    if (!gl) {
        alert("WebGL не підтримується");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.97, 0.97, 0.97, 1.0);

    var program = createProgram(document.getElementById("vertex-shader").text,
                                document.getElementById("fragment-shader").text);
    gl.useProgram(program);

    var vertices = [
        -1, -1,  1,
         1, -1,  1,
         1,  1,  1,
        -1,  1,  1,
        -1, -1, -1,
         1, -1, -1,
         1,  1, -1,
        -1,  1, -1
    ];

    var edges = [
        0, 1,  1, 2,  2, 3,  3, 0,
        4, 5,  5, 6,  6, 7,  7, 4,
        0, 4,  1, 5,  2, 6,  3, 7
    ];

    var vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    var ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(edges), gl.STATIC_DRAW);

    var aPosition = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);

    var model = mat4Multiply(mat4RotationX(degToRad(25)), mat4RotationY(degToRad(-35)));

    var view = mat4Translation(0, 0, -6);

    var aspect = canvas.width / canvas.height;
    var size = 2.5;
    var projection = mat4Ortho(-size * aspect, size * aspect, -size, size, 0.1, 100);

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uModel"), false, new Float32Array(model));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uView"), false, new Float32Array(view));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uProjection"), false, new Float32Array(projection));
    gl.uniform3f(gl.getUniformLocation(program, "uColor"), 0.1, 0.2, 0.6);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawElements(gl.LINES, edges.length, gl.UNSIGNED_SHORT, 0);
};
