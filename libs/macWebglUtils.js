/**
 * webgl.js
 * 
 */

// ========================================================
// CompilaÃ§Ã£o dos shaders
// baseado em: 
 // ========================================================
/**
 * cria o programa WebGL
 * @param {Obj} gl - contexto WebGL
 * @param {String} vertexShaderSrc - fonte do V Shader
 * @param {String} fragmentShaderSrc - fonte do F Shader
 * @returns - programa
 * 
 * Baseado em: https://webgl2fundamentals.org/webgl/lessons/webgl-fundamentals.html
 */
function makeProgram(gl, vertexShaderSrc, fragmentShaderSrc) 
{
    // Compilar e linkar os shaders
    var vertexShader = compile(gl, gl.VERTEX_SHADER, vertexShaderSrc);
    var fragmentShader = compile(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
    var program = link(gl, vertexShader, fragmentShader);
    if (program) {
        return program;
    }
    alert("ERRO: na criaÃ§Ã£o do programa.");
};

// ========================================================
/**
 * compila um shader
 * @param {Obj} gl - contexto WebGL
 * @param {*} type - gl.VERTEX_SHADER ou gl.FRAGMENT_SHADER
 * @param {*} source - cÃ³digo fonte
 * @returns - codigo compilado
 */
function compile (gl, type, source) 
{
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var deuCerto = gl.getShaderParameter(shader, gl.COMPILE_STATUS); 
    if (deuCerto) {
        return shader;
    }
    // mostra o erro
    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader); // limpa antes de sair
};

// ========================================================
/**
 * monta (liga ou linka?) o programa
 * @param {Obj} gl - contexto WebGL 
 * @param {*} vertexShader 
 * @param {*} fragmentShader 
 * @returns programa
 */
function link (gl, vertexShader, fragmentShader) 
{
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    var deuCerto = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (deuCerto) {
        return program;
    }

    console.log(gl.ProgramInfoLog(program));
    gl.deleteProgram(program); // limpa
};

// ========================================================
// Outras funÃ§Ãµes
// ========================================================

/**
* sorteia uma cor RGB ou RGBA. Se a==-1, sorteia A tambÃ©m.
* @param {*} a - retorna RGB se a==0, senÃ£o retorna RGBA.  
* @returns RBG ou RGBA
*/
function sorteieCorRGBA(a=1) {
   let r = Math.random();
   let g = Math.random();
   let b = Math.random();
   if (a==0)
       return [r, g, b];
   if (a==-1)
       a = Math.random();
   
   return  [r, g, b, a];
}

/**
* sorteia inteiro no intervalo [min, max]
* @param {Number} min 
* @param {Number} max 
* @returns Number
*/
function sorteieInteiro (min, max) {
   return Math.floor(Math.random() * (max - min) ) + min;
}