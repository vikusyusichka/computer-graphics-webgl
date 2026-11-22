var gl;
var canvas;
var program;
var loc = {};

var mainFiles = ["textures/wood_crate.png", "textures/bricks.png", "textures/stone.png"];
var mainNames = ["Дерев'яний ящик", "Цегла", "Камінь"];
var mainTextures = [];
var current = 0;

var extraFile = "textures/moss.png";
var extraTexture = null;

var angleX = 25, angleY = -35;
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

function initVertexBuffers() {
    var faces = [
        [[-0.5, -0.5,  0.5], [ 0.5, -0.5,  0.5], [ 0.5,  0.5,  0.5], [-0.5,  0.5,  0.5]],
        [[ 0.5, -0.5,  0.5], [ 0.5, -0.5, -0.5], [ 0.5,  0.5, -0.5], [ 0.5,  0.5,  0.5]],
        [[ 0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5,  0.5, -0.5], [ 0.5,  0.5, -0.5]],
        [[-0.5, -0.5, -0.5], [-0.5, -0.5,  0.5], [-0.5,  0.5,  0.5], [-0.5,  0.5, -0.5]],
        [[-0.5,  0.5,  0.5], [ 0.5,  0.5,  0.5], [ 0.5,  0.5, -0.5], [-0.5,  0.5, -0.5]],
        [[-0.5, -0.5, -0.5], [ 0.5, -0.5, -0.5], [ 0.5, -0.5,  0.5], [-0.5, -0.5,  0.5]]
    ];
    var uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
    var shade = [1.0, 0.8, 0.7, 0.85, 1.1, 0.6];

    var data = [];
    var indices = [];
    for (var f = 0; f < 6; f++) {
        for (var i = 0; i < 4; i++) {
            data.push(faces[f][i][0], faces[f][i][1], faces[f][i][2]);
            data.push(uv[i][0], uv[i][1]);
            data.push(shade[f]);
        }
        var s = f * 4;
        indices.push(s, s + 1, s + 2,  s, s + 2, s + 3);
    }

    var vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

    var FSIZE = Float32Array.BYTES_PER_ELEMENT;
    var stride = 6 * FSIZE;
    gl.vertexAttribPointer(loc.a_Position, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(loc.a_Position);
    gl.vertexAttribPointer(loc.a_TexCoord, 2, gl.FLOAT, false, stride, 3 * FSIZE);
    gl.enableVertexAttribArray(loc.a_TexCoord);
    gl.vertexAttribPointer(loc.a_Shade, 1, gl.FLOAT, false, stride, 5 * FSIZE);
    gl.enableVertexAttribArray(loc.a_Shade);

    var ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return indices.length;
}

function loadTexture(texture, image) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
}

function initTexture(file, onDone) {
    var texture = gl.createTexture();
    var image = new Image();
    image.onload = function () {
        loadTexture(texture, image);
        onDone();
    };
    image.onerror = function () {
        document.getElementById("error").innerHTML = "Не вдалося завантажити " + file;
    };
    image.src = file;
    return texture;
}

function initTextures(onAllLoaded) {
    var total = mainFiles.length + 1;
    var loaded = 0;
    function done() {
        loaded++;
        if (loaded == total) onAllLoaded();
    }

    for (var i = 0; i < mainFiles.length; i++) {
        mainTextures.push(initTexture(mainFiles[i], done));
    }
    extraTexture = initTexture(extraFile, done);
}

function render(now) {
    now = now * 0.001;
    var dt = now - lastTime;
    lastTime = now;
    if (document.getElementById("rotate").checked) {
        angleY += 30 * dt;
    }

    var model = mat4Multiply(mat4RotationX(degToRad(angleX)), mat4RotationY(degToRad(angleY)));
    var view = mat4Translation(0, 0, -2.6);
    var proj = mat4Perspective(45, canvas.width / canvas.height, 0.1, 100);
    var mvp = mat4Multiply(proj, mat4Multiply(view, model));
    gl.uniformMatrix4fv(loc.u_MVP, false, new Float32Array(mvp));

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, mainTextures[current]);
    gl.uniform1i(loc.u_Sampler0, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, extraTexture);
    gl.uniform1i(loc.u_Sampler1, 1);

    gl.uniform1i(loc.u_UseExtra, document.getElementById("useExtra").checked ? 1 : 0);
    gl.uniform1f(loc.u_Mix, parseFloat(document.getElementById("mix").value));

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, loc.count, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(render);
}

function updateInfo() {
    document.getElementById("info").innerHTML =
        "Текстура: " + mainNames[current] + " (" + (current + 1) + " з " + mainFiles.length + ")" +
        " | Текстурних блоків у GPU: " + gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
}

window.onload = function () {
    canvas = document.getElementById("glcanvas");
    gl = setupWebGL(canvas);
    if (!gl) {
        alert("WebGL не підтримується");
        return;
    }

    if (location.protocol == "file:") {
        document.getElementById("error").innerHTML =
            "Сторінку потрібно відкривати через локальний сервер (наприклад, Live Server у VS Code)";
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.85, 0.9, 0.95, 1.0);
    gl.enable(gl.DEPTH_TEST);

    program = createProgram(document.getElementById("vertex-shader").text,
                            document.getElementById("fragment-shader").text);
    gl.useProgram(program);

    loc.a_Position = gl.getAttribLocation(program, "a_Position");
    loc.a_TexCoord = gl.getAttribLocation(program, "a_TexCoord");
    loc.a_Shade = gl.getAttribLocation(program, "a_Shade");
    loc.u_MVP = gl.getUniformLocation(program, "u_MVP");
    loc.u_Sampler0 = gl.getUniformLocation(program, "u_Sampler0");
    loc.u_Sampler1 = gl.getUniformLocation(program, "u_Sampler1");
    loc.u_UseExtra = gl.getUniformLocation(program, "u_UseExtra");
    loc.u_Mix = gl.getUniformLocation(program, "u_Mix");

    loc.count = initVertexBuffers();

    canvas.addEventListener("mousedown", function () {
        current = (current + 1) % mainFiles.length;
        updateInfo();
    });

    initTextures(function () {
        updateInfo();
        requestAnimationFrame(function (t) {
            lastTime = t * 0.001;
            render(t);
        });
    });
};
