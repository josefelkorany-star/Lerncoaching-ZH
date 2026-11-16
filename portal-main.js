import config from './portal-config.js';
import {validConfiguration,createPortalApi} from './portal-api.js';
import {startPortal} from './portal-app.js';
import {mountPortal} from './portal-ui.js';

const root=document.getElementById('portal-root');
if(!validConfiguration(config,location.hostname)){
  mountPortal(root,{}).showUnavailable('Das Portal ist noch nicht freigeschaltet. Bei Fragen wende dich bitte direkt an Josef.');
}else if(!globalThis.supabase?.createClient){
  mountPortal(root,{}).showUnavailable('Das Portal konnte nicht geladen werden. Bitte später erneut versuchen.');
}else{
  startPortal({root,api:createPortalApi(config,globalThis.supabase.createClient),courseDates:globalThis.LCCourseData.dates});
}
