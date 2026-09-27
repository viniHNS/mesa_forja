// Three.js vem da CDN (jsDelivr), não do node_modules.
// O código importa 'three' e 'three/addons/...'; este plugin troca pelos URLs da CDN
// e injeta um importmap para que os addons (que importam 'three') usem a mesma instância.
const THREE_VERSION = '0.170.0';
const THREE_CDN = `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}`;
const THREE_URL = `${THREE_CDN}/build/three.module.js`;
const ADDONS_URL = `${THREE_CDN}/examples/jsm/`;

function threeFromCdn() {
  return {
    name: 'three-from-cdn',
    enforce: 'pre',
    resolveId(id) {
      if (id === 'three') return { id: THREE_URL, external: true };
      if (id.startsWith('three/addons/')) {
        return { id: ADDONS_URL + id.slice('three/addons/'.length), external: true };
      }
      return null;
    },
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          attrs: { type: 'importmap' },
          children: JSON.stringify({ imports: { three: THREE_URL, 'three/addons/': ADDONS_URL } }),
          injectTo: 'head-prepend',
        },
        { tag: 'link', attrs: { rel: 'modulepreload', href: THREE_URL, crossorigin: '' }, injectTo: 'head' },
      ];
    },
  };
}

export default {
  // caminho relativo: funciona em https://usuario.github.io/qualquer-nome-de-repo/
  base: './',
  plugins: [threeFromCdn()],
};
