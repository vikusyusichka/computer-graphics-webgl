// Лабораторна робота 6 - затінення поверхонь (ваза, затінення Фонга)

var gl;
var canvas;
var program;
var loc = {};          // розташування атрибутів і uniform-змінних
var indexCount = 0;

// кути повороту вази
var angleX = 15;
var angleY = 0;

// для обертання мишею
var dragging = false;
var lastX = 0, lastY = 0;
var lastTime = 0;

// положення камери у світових координатах
var xe = 0.0, ye = 0.3, ze = 5.0;


// =====================================================================
// 1. Створення контексту WebGL і шейдерної програми
// =====================================================================

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


// =====================================================================
// 2. Геометрія вази
// Ваза - поверхня обертання: профіль radius(y) обертається навколо осі Y
// =====================================================================

// радіус вази на висоті y (y від -1 до 1)
function radius(y) {
    // базовий радіус шийки
    var r = 0.3;
    // широке "пузо" в нижній частині (гаусоїда з центром y = -0.35)
    r += 0.38 * Math.exp(-Math.pow((y + 0.35) / 0.42, 2));
    // розширення горла зверху
    if (y > 0.5) {
        r += 0.2 * Math.pow((y - 0.5) / 0.5, 2);
    }
    return r;
}

function makeVase(segAround, segHeight) {
    var positions = [];
    var colors = [];
    var indices = [];

    // --- вершини бічної поверхні ---
    // по колу беремо segAround точок без повтору першої, а індекси замикаємо по модулю,
    // тоді на шві не буде різких переходів у нормалях
    for (var j = 0; j <= segHeight; j++) {
        var y = -1 + 2 * j / segHeight;
        var r = radius(y);
        for (var i = 0; i < segAround; i++) {
            var a = 2 * Math.PI * i / segAround;
            positions.push(r * Math.cos(a), y, r * Math.sin(a));

            // колір змінюється з висотою: теракотовий низ, світла смуга посередині
            var band = Math.exp(-Math.pow((y - 0.05) / 0.1, 2));
            colors.push(0.75 + 0.2 * band, 0.32 + 0.55 * band, 0.18 + 0.6 * band);
        }
    }

    for (var j = 0; j < segHeight; j++) {
        for (var i = 0; i < segAround; i++) {
            var a = j * segAround + i;
            var b = j * segAround + (i + 1) % segAround;
            var c = (j + 1) * segAround + i;
            var d = (j + 1) * segAround + (i + 1) % segAround;
            // порядок обходу - проти годинникової стрілки, якщо дивитися ззовні
            indices.push(a, c, b);
            indices.push(b, c, d);
        }
    }

    // --- дно вази (віяло трикутників навколо центральної точки) ---
    var center = positions.length / 3;
    positions.push(0, -1, 0);
    colors.push(0.75, 0.32, 0.18);
    for (var i = 0; i < segAround; i++) {
        indices.push(center, i, (i + 1) % segAround);
    }

    return { positions: positions, colors: colors, indices: indices };
}

// нормалі у вершинах рахуємо як середнє нормалей трикутників,
// до яких ця вершина належить (так само, як у методі Гуро)
function computeNormals(positions, indices) {
    var normals = new Array(positions.length).fill(0);

    for (var t = 0; t < indices.length; t += 3) {
        var i0 = indices[t] * 3, i1 = indices[t + 1] * 3, i2 = indices[t + 2] * 3;
        // два ребра трикутника
        var ux = positions[i1] - positions[i0];
        var uy = positions[i1 + 1] - positions[i0 + 1];
        var uz = positions[i1 + 2] - positions[i0 + 2];
        var vx = positions[i2] - positions[i0];
        var vy = positions[i2 + 1] - positions[i0 + 1];
        var vz = positions[i2 + 2] - positions[i0 + 2];
        // векторний добуток дає нормаль до трикутника
        var nx = uy * vz - uz * vy;
        var ny = uz * vx - ux * vz;
        var nz = ux * vy - uy * vx;
        // додаємо до всіх трьох вершин
        var ids = [i0, i1, i2];
        for (var k = 0; k < 3; k++) {
            normals[ids[k]] += nx;
            normals[ids[k] + 1] += ny;
            normals[ids[k] + 2] += nz;
        }
    }

    // нормалізуємо
    for (var i = 0; i < normals.length; i += 3) {
        var len = Math.sqrt(normals[i] * normals[i] + normals[i + 1] * normals[i + 1] +
                            normals[i + 2] * normals[i + 2]);
        if (len > 0) {
            normals[i] /= len;
            normals[i + 1] /= len;
            normals[i + 2] /= len;
        }
    }
    return normals;
}


// =====================================================================
// 3. Буфери
// =====================================================================

function passAttribData(data, attribLoc, size) {
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    gl.vertexAttribPointer(attribLoc, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attribLoc);
}

function initBuffers() {
    var vase = makeVase(48, 40);
    var normals = computeNormals(vase.positions, vase.indices);

    passAttribData(vase.positions, loc.a_coords, 3);
    passAttribData(vase.colors, loc.a_colors, 3);
    passAttribData(normals, loc.a_normal, 3);

    var ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vase.indices), gl.STATIC_DRAW);
    indexCount = vase.indices.length;
}


// =====================================================================
// 4. Матриці камери і перспективи
// =====================================================================

// базис камери (камера дивиться вздовж -z, тому осі збігаються зі світовими)
function basisMatrix() {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
}

// переносить точку огляду в початок координат
function eyeMatrix() {
    return mat4Translation(-xe, -ye, -ze);
}

function setMatrix(location, m) {
    gl.uniformMatrix4fv(location, false, new Float32Array(m));
}


// =====================================================================
// 5. Освітлення
// =====================================================================

function initLight() {
    // джерело задане в системі координат камери: зверху-праворуч, трохи спереду
    gl.uniform3f(loc.u_LightPosition, 3.0, 3.0, 2.0);
    gl.uniform3f(loc.u_LightColor, 1.0, 1.0, 1.0);
    gl.uniform3f(loc.u_AmbientLight, 0.2, 0.2, 0.22);
    gl.uniform3f(loc.u_SpecColor, 0.8, 0.8, 0.8);
}


// =====================================================================
// 6. Малювання
// =====================================================================

function render(now) {
    now = now * 0.001;
    var dt = now - lastTime;
    lastTime = now;

    // автоматичне обертання, якщо користувач зараз не крутить мишею
    if (document.getElementById("autoRotate").checked && !dragging) {
        angleY += 25 * dt;
    }

    // параметри з панелі
    var p = parseFloat(document.getElementById("p").value);
    document.getElementById("pVal").innerHTML = p;
    gl.uniform1f(loc.u_P, p);
    gl.uniform1i(loc.u_Mode, parseInt(document.getElementById("mode").value));

    // матриці моделі
    setMatrix(loc.u_T, mat4Translation(0, 0, 0));
    setMatrix(loc.u_Rx, mat4RotationX(degToRad(angleX)));
    setMatrix(loc.u_Ry, mat4RotationY(degToRad(angleY)));

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(render);
}


// =====================================================================
// 7. Обертання мишею
// =====================================================================

function initMouse() {
    canvas.addEventListener("mousedown", function (e) {
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
    });

    window.addEventListener("mouseup", function () {
        dragging = false;
    });

    window.addEventListener("mousemove", function (e) {
        if (!dragging) return;
        // зсув миші в пікселях перетворюємо на кути
        angleY += (e.clientX - lastX) * 0.5;
        angleX += (e.clientY - lastY) * 0.5;
        // обмежуємо нахил, щоб ваза не перекидалась
        angleX = Math.max(-80, Math.min(80, angleX));
        lastX = e.clientX;
        lastY = e.clientY;
    });
}


// =====================================================================
// 8. Запуск програми
// =====================================================================

window.onload = function () {
    canvas = document.getElementById("glcanvas");
    gl = setupWebGL(canvas);
    if (!gl) {
        alert("WebGL не підтримується");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.93, 0.93, 0.9, 1.0);
    gl.enable(gl.DEPTH_TEST);

    program = createProgram(document.getElementById("vertex-shader").text,
                            document.getElementById("fragment-shader").text);
    gl.useProgram(program);

    // отримуємо розташування всіх змінних шейдерів один раз
    var attribs = ["a_coords", "a_colors", "a_normal"];
    for (var i = 0; i < attribs.length; i++) {
        loc[attribs[i]] = gl.getAttribLocation(program, attribs[i]);
    }
    var uniforms = ["u_T", "u_Rx", "u_Ry", "u_Basis", "u_Eye", "u_Pers",
                    "u_LightColor", "u_LightPosition", "u_AmbientLight",
                    "u_SpecColor", "u_P", "u_Mode"];
    for (var i = 0; i < uniforms.length; i++) {
        loc[uniforms[i]] = gl.getUniformLocation(program, uniforms[i]);
    }

    initBuffers();
    initLight();

    // камера і перспектива не змінюються, тому задаємо їх один раз
    setMatrix(loc.u_Basis, basisMatrix());
    setMatrix(loc.u_Eye, eyeMatrix());
    setMatrix(loc.u_Pers, mat4Perspective(45, canvas.width / canvas.height, 0.1, 100));

    initMouse();

    requestAnimationFrame(function (t) {
        lastTime = t * 0.001;
        render(t);
    });
};
