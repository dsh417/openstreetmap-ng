import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(here, 'dist');
fs.mkdirSync(output, {recursive:true});
const stubs = {
  '@index/remote-edit': 'export const openRemoteEdit=()=>{}; export const parseRemoteEditTargetFromQueryParams=()=>null;',
  '@index/router': 'export {routerRoute} from "fixture-state";',
  '@index/router-outlet': 'export {IndexRouterOutlet} from "fixture-state";',
  '@index/search-form': 'export const SearchForm=()=>null;',
  '@index/sidebar': 'export {RightSidebarOutlet} from "fixture-state";',
  '@map/main-map': 'export {mainMap,rightSidebar,initMainMap} from "fixture-state";',
  '@map/alerts': 'export const MapAlerts=()=>null; export const MapAlertPanel=()=>null; export const pushMapAlert=()=>{};',
  '@map/layers/layers': 'export const addMapLayer=()=>{}; export const removeMapLayer=()=>{};',
  '@utils/query-string': 'export const qsParseAll=()=>({});',
  '@utils/config': 'export const isBreakpointUp=b=>window.matchMedia(`(min-width: ${{md:768}[b]}px)`).matches;',
  '../navbar/navbar': 'export const collapseNavbar=()=>{};',
  '../navbar/navbar-left-state': 'export const updateNavbarAndHash=()=>{};',
};
const manifest = {createdAt:new Date().toISOString(), modes:{}, dependencies:JSON.parse(fs.readFileSync(path.join(here,'package.json'))).devDependencies};
for (const mode of ['baseline', 'patched']) {
  const repo = path.resolve(process.env[`${mode.toUpperCase()}_REPO`] || path.join(here,'../../.sources',mode));
  manifest.modes[mode] = {commit:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(), dirty:execFileSync('git',['status','--porcelain','--','app/views'],{cwd:repo,encoding:'utf8'}).trim()};
  await build({
    entryPoints:[path.join(here,'entry.tsx')], bundle:true, format:'iife', outfile:path.join(output,mode+'.js'),
    nodePaths:[path.join(here,'node_modules')], jsx:'automatic', jsxImportSource:'preact', sourcemap:true,
    plugins:[{name:'explicit-fixture-adapters',setup(b){
      b.onResolve({filter:/^fixture-state$/},()=>({path:path.join(here,'state.tsx')}));
      b.onResolve({filter:/^production-app$/},()=>({path:path.join(repo,'app/views/index/app.tsx')}));
      b.onResolve({filter:/.*/},args=>{
        if(stubs[args.path]) return {path:args.path,namespace:'fixture-adapter'};
        if(args.path.startsWith('@map/') || args.path.startsWith('@utils/')) return {path:path.join(repo,'app/views',args.path.slice(1)+'.ts')};
      });
      b.onLoad({filter:/.*/,namespace:'fixture-adapter'},args=>({contents:stubs[args.path],loader:'ts',resolveDir:here}));
    }}],
  });
}
fs.copyFileSync(path.join(here,'node_modules/maplibre-gl/dist/maplibre-gl.css'),path.join(output,'maplibre-gl.css'));
fs.copyFileSync(path.join(here,'index.html'),path.join(output,'index.html'));
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));
