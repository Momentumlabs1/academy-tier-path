import {continueRender, delayRender, staticFile} from 'remotion';

let loaded = false;

export const ensureFont = () => {
  if (loaded) return;
  loaded = true;
  const handle = delayRender('Loading Inter font');
  const font = new FontFace(
    'InterVideo',
    `url('${staticFile('fonts/InterVariable.woff2')}') format('woff2')`,
    {weight: '100 900'},
  );
  font
    .load()
    .then(() => {
      (document.fonts as unknown as {add: (f: FontFace) => void}).add(font);
      continueRender(handle);
    })
    .catch(() => continueRender(handle));
};
