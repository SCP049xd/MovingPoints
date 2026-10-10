const names='alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega'.split(' ');
const letters=Array.from('αβγδεζηθικλμνξοπρστυφχψω');
export function greekName(value){
  return value.normalize('NFC').replace(/\\?\b(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)(?=\b|\d|_)/gi,(match,name)=>{
    const letter=letters[names.indexOf(name.toLowerCase())];
    return name[0]===name[0].toUpperCase()?letter.toUpperCase():letter;
  });
}
