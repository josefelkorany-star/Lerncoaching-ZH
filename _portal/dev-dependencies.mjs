import {createRequire} from 'node:module';
import path from 'node:path';
export function dependency(name){
  const require=createRequire(process.env.PORTAL_DEPENDENCY_ROOT?path.resolve(process.env.PORTAL_DEPENDENCY_ROOT,'package.json'):import.meta.url);
  try{return require(name);}catch{throw new Error(`Lokales Testwerkzeug fehlt: ${name}. Zuerst npm ci --prefix _portal --ignore-scripts ausführen.`);}
}
