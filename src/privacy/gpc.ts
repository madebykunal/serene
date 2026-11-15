import { getState } from '../state/store';

const HEADERS = { 'Sec-GPC': '1', DNT: '1' };

export function withPrivacyHeaders(uri: string): { uri: string; headers?: Record<string, string> } {
  return getState().settings.doNotTrack ? { uri, headers: HEADERS } : { uri };
}

export const GPC_SCRIPT = `(function(){try{
var d=function(o,k,v){try{Object.defineProperty(o,k,{get:function(){return v},configurable:true})}catch(e){}};
d(Navigator.prototype,'globalPrivacyControl',true);d(Navigator.prototype,'doNotTrack','1');d(window,'doNotTrack','1');
}catch(e){}})();true;`;
