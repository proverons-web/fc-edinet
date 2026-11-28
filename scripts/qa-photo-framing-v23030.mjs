import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fitFrame, frameGeometry, zoomToFit } from '../lib/photo-framing.ts';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const stage={width:872,height:329};
for(const image of [{width:1920,height:1080},{width:1080,height:1920},{width:3000,height:500},{width:1000,height:1000}]){
 const original=fitFrame(stage,image.width/image.height);
 const whole=frameGeometry(image,original,1,{x:0,y:0}).crop;
 near(whole.width,image.width);near(whole.height,image.height);near(whole.x,0);near(whole.y,0);
 for(const ratio of [4/5,16/9,1]){
  const frame=fitFrame(stage,ratio);
  const fit=frameGeometry(image,frame,zoomToFit(image,frame),{x:0,y:0});
  assert.ok(fit.crop.x<=1e-6&&fit.crop.y<=1e-6);
  assert.ok(fit.crop.x+fit.crop.width>=image.width-1e-6&&fit.crop.y+fit.crop.height>=image.height-1e-6);
  const fill=frameGeometry(image,frame,1,{x:1e9,y:-1e9});
  assert.ok(fill.crop.x>=-1e-6&&fill.crop.y>=-1e-6);
  assert.ok(fill.crop.x+fill.crop.width<=image.width+1e-6&&fill.crop.y+fill.crop.height<=image.height+1e-6);
  const zoom=frameGeometry(image,frame,3,{x:0,y:0});near(zoom.crop.width/zoom.crop.height,ratio);
 }
}
const css=fs.readFileSync(new URL('../app/news-frame-ratios.css',import.meta.url),'utf8');
for(const [selector,frame] of [['fcRefLeadNewsMedia','home'],['fcRefNewsRow>div','home-list'],['newsLeadMedia','lead'],['newsSecondaryMedia','secondary'],['newsDbMedia','archive'],['articleCoverFrame','article']]) assert.ok(css.includes(`.${selector},.newsFramePreview[data-frame="${frame}"]`));
assert.match(css,/aspect-ratio:var\(--news-frame-ratio\)!important/);
assert.match(css,/data-device="mobile"\]\[data-frame="article"\]\{--news-frame-ratio:4\/3\}/);
console.log('PASS: original, fit, fill, pan bounds, zoom and six shared public preview frames.');
