// The same navigation container is used on desktop and mobile.
const portalLink=document.querySelector('[data-portal-link]');
if(portalLink)portalLink.hidden=globalThis.LCSiteConfig?.portalEnabled!==true;
