import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'payment/:checkoutId',
    renderMode: RenderMode.Server
  },
  {
    path: 'panel/invoice/:type',
    renderMode: RenderMode.Server
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
