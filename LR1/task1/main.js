var gl;

function setupWebGL(canvas) {
    var context = canvas.getContext("webgl");
    if (!context) {
        context = canvas.getContext("experimental-webgl");
    }
    return context;
}

window.onload = function () {
    var canvas = document.getElementById("glcanvas");

    gl = setupWebGL(canvas);
    if (!gl) {
        alert("Не вдалося ініціалізувати WebGL. Браузер не підтримує WebGL.");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(0.1, 0.2, 0.45, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
};
