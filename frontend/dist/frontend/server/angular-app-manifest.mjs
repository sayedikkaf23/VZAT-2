
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "route": "/paymentSchedule"
  },
  {
    "renderMode": 2,
    "route": "/adminLogin"
  },
  {
    "renderMode": 0,
    "route": "/payment/*"
  },
  {
    "renderMode": 0,
    "route": "/payment/result"
  },
  {
    "renderMode": 2,
    "route": "/login"
  },
  {
    "renderMode": 2,
    "route": "/active-services"
  },
  {
    "renderMode": 2,
    "route": "/help-center"
  },
  {
    "renderMode": 2,
    "route": "/saved-card"
  },
  {
    "renderMode": 2,
    "route": "/panel"
  },
  {
    "renderMode": 2,
    "route": "/panel/roles"
  },
  {
    "renderMode": 2,
    "route": "/panel/add_role"
  },
  {
    "renderMode": 2,
    "route": "/panel/users"
  },
  {
    "renderMode": 2,
    "route": "/panel/add_user"
  },
  {
    "renderMode": 2,
    "route": "/panel/profile"
  },
  {
    "renderMode": 2,
    "route": "/panel/mail"
  },
  {
    "renderMode": 2,
    "route": "/panel/payment-method"
  },
  {
    "renderMode": 2,
    "route": "/panel/manual_invoice_payment"
  },
  {
    "renderMode": 0,
    "route": "/panel/invoice/*"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 19138, hash: '1a4063b8f2df67e0253286dd227167ccfc272467b2c04d0db6ba49b70cfa06d5', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 17179, hash: '2010a141ff237a2f3593dc515f225f7fa28527d37da7f98bf7556c05e39bed1d', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'saved-card/index.html': {size: 130548, hash: '88e5f465bd4d5471e622ff0b4fdbc553db8613f786953fcc808af74e3ba39121', text: () => import('./assets-chunks/saved-card_index_html.mjs').then(m => m.default)},
    'panel/index.html': {size: 33657, hash: 'ad5a6462000f1fbc5b55c6f05e26f91c91bdb150fb0f38c2503b502efee18a5f', text: () => import('./assets-chunks/panel_index_html.mjs').then(m => m.default)},
    'paymentSchedule/index.html': {size: 355279, hash: '1916b943b6a87132f034f8d6b2f8235bfccfd2d73cef2d9ae5db2e108cf2ee3d', text: () => import('./assets-chunks/paymentSchedule_index_html.mjs').then(m => m.default)},
    'panel/profile/index.html': {size: 33657, hash: 'ad5a6462000f1fbc5b55c6f05e26f91c91bdb150fb0f38c2503b502efee18a5f', text: () => import('./assets-chunks/panel_profile_index_html.mjs').then(m => m.default)},
    'panel/users/index.html': {size: 33657, hash: 'ad5a6462000f1fbc5b55c6f05e26f91c91bdb150fb0f38c2503b502efee18a5f', text: () => import('./assets-chunks/panel_users_index_html.mjs').then(m => m.default)},
    'panel/payment-method/index.html': {size: 33657, hash: 'ad5a6462000f1fbc5b55c6f05e26f91c91bdb150fb0f38c2503b502efee18a5f', text: () => import('./assets-chunks/panel_payment-method_index_html.mjs').then(m => m.default)},
    'panel/roles/index.html': {size: 33657, hash: 'ad5a6462000f1fbc5b55c6f05e26f91c91bdb150fb0f38c2503b502efee18a5f', text: () => import('./assets-chunks/panel_roles_index_html.mjs').then(m => m.default)},
    'panel/add_user/index.html': {size: 33657, hash: 'ad5a6462000f1fbc5b55c6f05e26f91c91bdb150fb0f38c2503b502efee18a5f', text: () => import('./assets-chunks/panel_add_user_index_html.mjs').then(m => m.default)},
    'active-services/index.html': {size: 185791, hash: '031bdd5d80906a63d3cc07f5c494c2db0326cd0326b4fe7c264ac6889656ffe8', text: () => import('./assets-chunks/active-services_index_html.mjs').then(m => m.default)},
    'panel/manual_invoice_payment/index.html': {size: 33657, hash: 'ad5a6462000f1fbc5b55c6f05e26f91c91bdb150fb0f38c2503b502efee18a5f', text: () => import('./assets-chunks/panel_manual_invoice_payment_index_html.mjs').then(m => m.default)},
    'panel/mail/index.html': {size: 33657, hash: 'ad5a6462000f1fbc5b55c6f05e26f91c91bdb150fb0f38c2503b502efee18a5f', text: () => import('./assets-chunks/panel_mail_index_html.mjs').then(m => m.default)},
    'help-center/index.html': {size: 175154, hash: '1e956371cde776f5444724d44e2d9a26781b31b29ee7382fc2f7367f65600ed2', text: () => import('./assets-chunks/help-center_index_html.mjs').then(m => m.default)},
    'panel/add_role/index.html': {size: 33657, hash: 'ad5a6462000f1fbc5b55c6f05e26f91c91bdb150fb0f38c2503b502efee18a5f', text: () => import('./assets-chunks/panel_add_role_index_html.mjs').then(m => m.default)},
    'login/index.html': {size: 89156, hash: '7e6215674c8b80a0a87622442690278f5141ef80ecb443e507e02205259ec745', text: () => import('./assets-chunks/login_index_html.mjs').then(m => m.default)},
    'adminLogin/index.html': {size: 33657, hash: 'ad5a6462000f1fbc5b55c6f05e26f91c91bdb150fb0f38c2503b502efee18a5f', text: () => import('./assets-chunks/adminLogin_index_html.mjs').then(m => m.default)},
    'styles-DWLR4NRJ.css': {size: 194058, hash: '/19O0uQCnGw', text: () => import('./assets-chunks/styles-DWLR4NRJ_css.mjs').then(m => m.default)}
  },
};
