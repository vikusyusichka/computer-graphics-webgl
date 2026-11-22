var gl;
var canvas;
var shadowProg, sceneProg;
var shadowLoc = {}, sceneLoc = {};
var fbo;
var SHADOW_SIZE = 1024;
var cubeCount = 0;

var objects = [
    { pos: [0, -0.1, 0],   size: [8, 0.2, 8],   color: [0.55, 0.7, 0.45] },
    { pos: [-1.0, 1.0, -0.3], size: [1, 2, 1],  color: [0.85, 0.3, 0.25] },
    { pos: [1.4, 0.4, 0.9], size: [1.4, 0.8, 1], color: [0.3, 0.45, 0.85] }
];

var lightAngle = 40;
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

function createProgram(vsId, fsId) {
    var vs = createShader(gl.VERTEX_SHADER, document.getElementById(vsId).text);
    var fs = createShader(gl.FRAGMENT_SHADER, document.getElementById(fsId).text);

    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, "a_Position");
    gl.bindAttribLocation(prog, 1, "a_Normal");
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        alert("Помилка лінкування програми: " + gl.getProgramInfoLog(prog));
        return null;
    }
    return prog;
}

function initCube() {
    var faces = [
        { n: [0, 0, 1],  v: [[-0.5,-0.5, 0.5], [ 0.5,-0.5, 0.5], [ 0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]] },
        { n: [0, 0, -1], v: [[ 0.5,-0.5,-0.5], [-0.5,-0.5,-0.5], [-0.5, 0.5,-0.5], [ 0.5, 0.5,-0.5]] },
        { n: [1, 0, 0],  v: [[ 0.5,-0.5, 0.5], [ 0.5,-0.5,-0.5], [ 0.5, 0.5,-0.5], [ 0.5, 0.5, 0.5]] },
        { n: [-1, 0, 0], v: [[-0.5,-0.5,-0.5], [-0.5,-0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5,-0.5]] },
        { n: [0, 1, 0],  v: [[-0.5, 0.5, 0.5], [ 0.5, 0.5, 0.5], [ 0.5, 0.5,-0.5], [-0.5, 0.5,-0.5]] },
        { n: [0, -1, 0], v: [[-0.5,-0.5,-0.5], [ 0.5,-0.5,-0.5], [ 0.5,-0.5, 0.5], [-0.5,-0.5, 0.5]] }
    ];
    var positions = [], normals = [], indices = [];
    for (var f = 0; f < 6; f++) {
        for (var i = 0; i < 4; i++) {
            positions.push(faces[f].v[i][0], faces[f].v[i][1], faces[f].v[i][2]);
            normals.push(faces[f].n[0], faces[f].n[1], faces[f].n[2]);
        }
        var s = f * 4;
        indices.push(s, s + 1, s + 2,  s, s + 2, s + 3);
    }

    var pbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pbuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    var nbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nbuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);

    var ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    cubeCount = indices.length;
}

function initFramebuffer() {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SHADOW_SIZE, SHADOW_SIZE, 0,
                  gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    var depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, SHADOW_SIZE, SHADOW_SIZE);

    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
        alert("Framebuffer не готовий");
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    fb.texture = texture;
    return fb;
}

function mat4LookAt(eye, target, up) {
    var zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
    var len = Math.sqrt(zx * zx + zy * zy + zz * zz);
    zx /= len; zy /= len; zz /= len;
    var xx = up[1] * zz - up[2] * zy;
    var xy = up[2] * zx - up[0] * zz;
    var xz = up[0] * zy - up[1] * zx;
    len = Math.sqrt(xx * xx + xy * xy + xz * xz);
    xx /= len; xy /= len; xz /= len;
    var yx = zy * xz - zz * xy;
    var yy = zz * xx - zx * xz;
    var yz = zx * xy - zy * xx;
    return [
        xx, yx, zx, 0,
        xy, yy, zy, 0,
        xz, yz, zz, 0,
        -(xx * eye[0] + xy * eye[1] + xz * eye[2]),
        -(yx * eye[0] + yy * eye[1] + yz * eye[2]),
        -(zx * eye[0] + zy * eye[1] + zz * eye[2]),
        1
    ];
}

function modelMatrix(obj) {
    return mat4Multiply(mat4Translation(obj.pos[0], obj.pos[1], obj.pos[2]),
                        mat4Scaling(obj.size[0], obj.size[1], obj.size[2]));
}

function getLightPos() {
    var a = degToRad(lightAngle);
    var h = parseFloat(document.getElementById("lightHeight").value);
    return [4.5 * Math.cos(a), h, 4.5 * Math.sin(a)];
}

function render(now) {
    now = now * 0.001;
    var dt = now - lastTime;
    lastTime = now;

    var slider = document.getElementById("lightAngle");
    if (document.getElementById("rotateLight").checked) {
        lightAngle = (lightAngle + 30 * dt) % 360;
        slider.value = lightAngle;
    } else {
        lightAngle = parseFloat(slider.value);
    }
    document.getElementById("alphaVal").innerHTML = document.getElementById("shadowAlpha").value;

    var lightPos = getLightPos();
    var lightView = mat4LookAt(lightPos, [0, 0, 0], [0, 1, 0]);
    var lightProj = mat4Perspective(70, 1.0, 1.0, 30.0);
    var lightPV = mat4Multiply(lightProj, lightView);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, SHADOW_SIZE, SHADOW_SIZE);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(shadowProg);

    var i, model;
    for (i = 0; i < objects.length; i++) {
        model = modelMatrix(objects[i]);
        gl.uniformMatrix4fv(shadowLoc.u_LightMVP, false, new Float32Array(mat4Multiply(lightPV, model)));
        gl.drawElements(gl.TRIANGLES, cubeCount, gl.UNSIGNED_SHORT, 0);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.78, 0.86, 0.95, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(sceneProg);

    var camPV;
    if (document.getElementById("viewMode").value == "light") {
        camPV = mat4Multiply(mat4Perspective(70, canvas.width / canvas.height, 1.0, 30.0), lightView);
    } else {
        var view = mat4LookAt([0, 6, 9], [0, 0, 0], [0, 1, 0]);
        camPV = mat4Multiply(mat4Perspective(45, canvas.width / canvas.height, 0.1, 100), view);
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
    gl.uniform1i(sceneLoc.u_ShadowMap, 0);

    gl.uniform3fv(sceneLoc.u_LightPos, lightPos);
    gl.uniform1i(sceneLoc.u_UseShadows, document.getElementById("useShadows").checked ? 1 : 0);
    gl.uniform1f(sceneLoc.u_ShadowAlpha, parseFloat(document.getElementById("shadowAlpha").value));
    gl.uniform1f(sceneLoc.u_Bias, 0.002);

    for (i = 0; i < objects.length; i++) {
        model = modelMatrix(objects[i]);
        gl.uniformMatrix4fv(sceneLoc.u_Model, false, new Float32Array(model));
        gl.uniformMatrix4fv(sceneLoc.u_MVP, false, new Float32Array(mat4Multiply(camPV, model)));
        gl.uniformMatrix4fv(sceneLoc.u_LightMVP, false, new Float32Array(mat4Multiply(lightPV, model)));
        gl.uniform3fv(sceneLoc.u_Color, objects[i].color);
        gl.drawElements(gl.TRIANGLES, cubeCount, gl.UNSIGNED_SHORT, 0);
    }

    requestAnimationFrame(render);
}

window.onload = function () {
    canvas = document.getElementById("glcanvas");
    gl = setupWebGL(canvas);
    if (!gl) {
        alert("WebGL не підтримується");
        return;
    }

    gl.enable(gl.DEPTH_TEST);

    shadowProg = createProgram("shadow-vs", "shadow-fs");
    shadowLoc.u_LightMVP = gl.getUniformLocation(shadowProg, "u_LightMVP");

    sceneProg = createProgram("scene-vs", "scene-fs");
    var names = ["u_MVP", "u_Model", "u_LightMVP", "u_ShadowMap", "u_Color",
                 "u_LightPos", "u_UseShadows", "u_ShadowAlpha", "u_Bias"];
    for (var i = 0; i < names.length; i++) {
        sceneLoc[names[i]] = gl.getUniformLocation(sceneProg, names[i]);
    }

    initCube();
    fbo = initFramebuffer();

    requestAnimationFrame(function (t) {
        lastTime = t * 0.001;
        render(t);
    });
};
