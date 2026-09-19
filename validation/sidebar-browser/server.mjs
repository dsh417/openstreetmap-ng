import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root = new URL('./dist/',import.meta.url);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.map':'application/json'};
createServer(async(req,res)=>{
  try {
    const name = new URL(req.url,'http://localhost').pathname === '/' ? 'index.html' : new URL(req.url,'http://localhost').pathname.slice(1);
    if(!/^[a-zA-Z0-9.-]+$/.test(name)) {res.writeHead(404).end();return;}
    const body = await readFile(new URL(name,root));
    res.writeHead(200,{'Content-Type':types['.'+name.split('.').at(-1)]||'application/octet-stream','Cache-Control':'no-store'}).end(body);
  } catch {res.writeHead(404).end();}
}).listen(4173,'127.0.0.1');
