'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let lightPositionEl;

function deg2rad(angle) {
    return angle * Math.PI / 180;
}


// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function(vertices, normal) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normal), gl.STREAM_DRAW);

        this.count = vertices.length/3;
    }

    this.Draw = function() {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iNormal);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;
    this.iModelViewInverseTranspose = -1;

    // Normals
    this.iNormal = -1;

    // Light position
    this.iLightPos = -1;
    this.iCamPosition = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* Set the values of the projection transformation */
    let projection = m4.orthographic(-20, 20, -20, 20, -20, 20);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();
    let rotateToPointZero = m4.axisRotation([0.707,0.707,0], 0.7);
    let translateToPointZero = m4.translation(0,0,-10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView );
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0 );

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1 );

    const modelviewInv = m4.inverse(matAccum1, new Float32Array(16));
    const modelviewInvTranspose = m4.transpose(modelviewInv, new Float32Array(16));

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection );
    gl.uniformMatrix4fv(shProgram.iModelViewInverseTranspose, false, modelviewInvTranspose);

    gl.uniform3fv(shProgram.iLightPos, [3, 0, 0]);
    gl.uniform3fv(shProgram.iCamPosition, [0, 0, -20]);

    surface.Draw();
}

function CreateSurfaceData() {
    let vertexList = [];
    let normalList = [];
    let scale = 1;
    let R2 = 4;
    let R1 = 1.3 * R2;
    const a = R2 - R1;
    const c = 4 * R1;
    const b = c;

    //  Surface of Conjugation of Coaxial Cylinder and Cone

    for (let z = 0; z < b; z += 0.5) {
        for (let beta = 0; beta <= 2 * Math.PI; beta += 0.2) {
            const p1 = createPoint(beta, z);
            const p2 = createPoint(beta, z + 0.5);
            const p3 = createPoint(beta + 0.2, z);
            const p4 = createPoint(beta + 0.2, z + 0.5);

            let normal1 = calculateFacetNormal(p1, p2, p3);
            let normal2 = calculateFacetNormal(p3, p2, p4);
            let avg = calculateAverageNormal(normal1, normal2);

            vertexList.push(p1.x, p1.y, p1.z);
            normalList.push(avg[0], avg[1], avg[2]);

            vertexList.push(p2.x, p2.y, p2.z);
            normalList.push(avg[0], avg[1], avg[2]);

            vertexList.push(p3.x, p3.y, p3.z);
            normalList.push(avg[0], avg[1], avg[2]);

            vertexList.push(p2.x, p2.y, p2.z);
            normalList.push(avg[0], avg[1], avg[2]);

            vertexList.push(p3.x, p3.y, p3.z);
            normalList.push(avg[0], avg[1], avg[2]);

            vertexList.push(p4.x, p4.y, p4.z);
            normalList.push(avg[0], avg[1], avg[2]);
        }
    }

    return { vertices: vertexList, normal: normalList };
}

function calculateFacetNormal(pointForNormal, p1, p2) {
    const v1 = m4.subtractVectors([pointForNormal.x, pointForNormal.y, pointForNormal.z], [p1.x, p1.y, p1.z]);
    const v2 = m4.subtractVectors([p2.x, p2.y, p2.z], [p1.x, p1.y, p1.z]);
    return m4.normalize(m4.cross(v1, v2));
}

function calculateAverageNormal(n1, n2) {
    return m4.normalize(m4.addVectors(n1, n2));
}

function createPoint(beta, z) {
    let R2 = 4;
    let R1 = 1.3 * R2;
    const a = R2 - R1;
    const c = 4 * R1;
    const b = c;

    const r = a * (1 - Math.cos(2 * Math.PI * z / c)) + R1;
    const x = r * Math.cos(beta);
    const y = r * Math.sin(beta);
    return {x, y, z};
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex              = gl.getAttribLocation(prog, "vertex");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iModelViewInverseTranspose = gl.getUniformLocation(prog, "ModelViewInverseTranspose");

    shProgram.iNormal                    = gl.getAttribLocation(prog, 'normal');

    shProgram.iLightPos                  = gl.getUniformLocation(prog, 'lightPosition');
    shProgram.iCamPosition                  = gl.getUniformLocation(prog, 'CamPosition');

    surface = new Model('Surface');
    const data = CreateSurfaceData();
    surface.BufferData(data.vertices, data.normal);

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    lightPositionEl = document.getElementById('lightPostion');

    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    draw()
}
