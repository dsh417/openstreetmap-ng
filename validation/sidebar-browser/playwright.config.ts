import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests',fullyParallel:false,workers:1,retries:0,timeout:30000,
  reporter:[['list'],['json',{outputFile:'results/report.json'}],['html',{outputFolder:'results/html',open:'never'}]],
  outputDir:'results/artifacts',
  use:{baseURL:'http://127.0.0.1:4173',browserName:'chromium',viewport:{width:390,height:844},deviceScaleFactor:1,screenshot:'on',trace:'retain-on-failure',launchOptions:{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}},
  webServer:{command:'npm run serve',url:'http://127.0.0.1:4173',reuseExistingServer:false,timeout:10000},
});
