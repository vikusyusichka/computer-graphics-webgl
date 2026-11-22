function mat4Identity() {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
}

function mat4Multiply(a, b) {
    var r = [];
    for (var col = 0; col < 4; col++) {
        for (var row = 0; row < 4; row++) {
            var sum = 0;
            for (var k = 0; k < 4; k++) {
                sum += a[k * 4 + row] * b[col * 4 + k];
            }
            r[col * 4 + row] = sum;
        }
    }
    return r;
}

function mat4Translation(tx, ty, tz) {
    return [
        1,  0,  0,  0,
        0,  1,  0,  0,
        0,  0,  1,  0,
        tx, ty, tz, 1
    ];
}

function mat4Scaling(sx, sy, sz) {
    return [
        sx, 0,  0,  0,
        0,  sy, 0,  0,
        0,  0,  sz, 0,
        0,  0,  0,  1
    ];
}

function mat4RotationX(a) {
    var c = Math.cos(a), s = Math.sin(a);
    return [
        1, 0,  0, 0,
        0, c,  s, 0,
        0, -s, c, 0,
        0, 0,  0, 1
    ];
}

function mat4RotationY(a) {
    var c = Math.cos(a), s = Math.sin(a);
    return [
        c, 0, -s, 0,
        0, 1, 0,  0,
        s, 0, c,  0,
        0, 0, 0,  1
    ];
}

function mat4RotationZ(a) {
    var c = Math.cos(a), s = Math.sin(a);
    return [
        c,  s, 0, 0,
        -s, c, 0, 0,
        0,  0, 1, 0,
        0,  0, 0, 1
    ];
}

function mat4Ortho(left, right, bottom, top, near, far) {
    var lr = 1 / (right - left);
    var bt = 1 / (top - bottom);
    var nf = 1 / (far - near);
    return [
        2 * lr, 0, 0, 0,
        0, 2 * bt, 0, 0,
        0, 0, -2 * nf, 0,
        -(right + left) * lr, -(top + bottom) * bt, -(far + near) * nf, 1
    ];
}

function mat4Perspective(fovy, aspect, near, far) {
    var f = 1.0 / Math.tan(fovy * Math.PI / 360);
    var nf = 1 / (near - far);
    return [
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) * nf, -1,
        0, 0, 2 * far * near * nf, 0
    ];
}

function degToRad(d) {
    return d * Math.PI / 180;
}
