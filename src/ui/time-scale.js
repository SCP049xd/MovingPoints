export function sliderToTheta(degrees,scale=1){
  if(degrees<=-180)return -Math.PI;
  if(degrees>=180)return Math.PI;
  return 2*Math.atan(scale*Math.tan(degrees*Math.PI/360));
}
export function thetaToSlider(theta,scale=1){
  let angle=theta%(2*Math.PI);
  if(angle>Math.PI)angle-=2*Math.PI;
  if(angle< -Math.PI)angle+=2*Math.PI;
  if(Math.abs(Math.abs(angle)-Math.PI)<1e-12)return Math.sign(angle)*180;
  return 360/Math.PI*Math.atan(Math.tan(angle/2)/scale);
}
