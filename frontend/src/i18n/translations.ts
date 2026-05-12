export type LangCode = 'es' | 'en' | 'zh' | 'fr' | 'ar';

export const LANGUAGES: { code: LangCode; label: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'es', label: 'Español', dir: 'ltr' },
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'zh', label: '中文', dir: 'ltr' },
  { code: 'fr', label: 'Français', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
];

export type Translations = Record<string, Record<LangCode, string>>;

export const translations: Translations = {
  // ── Nav ──
  'nav.producto':        { es:'Producto', en:'Product', zh:'产品', fr:'Produit', ar:'المنتج' },
  'nav.caracteristicas': { es:'Características', en:'Features', zh:'特点', fr:'Caractéristiques', ar:'الميزات' },
  'nav.opiniones':       { es:'Opiniones', en:'Reviews', zh:'评价', fr:'Avis', ar:'التقييمات' },
  'nav.comprar':         { es:'Comprar', en:'Buy Now', zh:'立即购买', fr:'Acheter', ar:'اشتر الآن' },
  'nav.carrito':         { es:'Carrito', en:'Cart', zh:'购物车', fr:'Panier', ar:'السلة' },
  'nav.ssl':             { es:'SSL Seguro', en:'SSL Secure', zh:'SSL安全', fr:'SSL Sécurisé', ar:'SSL آمن' },

  // ── Announce bar ──
  'announce.envio':      { es:'Envío gratis en pedidos desde €25', en:'Free shipping on orders over €25', zh:'满25欧元免运费', fr:'Livraison gratuite dès 25€', ar:'شحن مجاني للطلبات فوق 25 يورو' },
  'announce.pago':       { es:'Pago 100% seguro con Stripe', en:'100% secure payment with Stripe', zh:'Stripe 100%安全支付', fr:'Paiement 100% sécurisé par Stripe', ar:'دفع آمن 100% مع Stripe' },
  'announce.devolucion': { es:'30 días devolución gratuita', en:'30 days free returns', zh:'30天免费退货', fr:'30 jours retour gratuit', ar:'30 يوم إرجاع مجاني' },
  'announce.clientes':   { es:'+4.200 clientes satisfechos', en:'+4,200 satisfied customers', zh:'超过4,200位满意客户', fr:'+4.200 clients satisfaits', ar:'+4,200 عميل راضٍ' },

  // ── Countdown ──
  'cd.label':            { es:'Oferta — termina en:', en:'Offer ends in:', zh:'优惠 — 剩余时间:', fr:'Offre — se termine en:', ar:'العرض — ينتهي في:' },
  'cd.viendo':           { es:'viendo', en:'watching', zh:'正在查看', fr:'regardent', ar:'يشاهدون' },

  // ── Hero ──
  'hero.badge':          { es:'Nuevo 2025 — Edición Premium', en:'New 2025 — Premium Edition', zh:'2025新款 — 高级版', fr:'Nouveau 2025 — Édition Premium', ar:'جديد 2025 — إصدار بريميوم' },
  'hero.title1':         { es:'El cargador que', en:'The charger that', zh:'重新定义您空间的', fr:'Le chargeur qui', ar:'الشاحن الذي' },
  'hero.title2':         { es:'redefine', en:'redefines', zh:'重新定义', fr:'redéfinit', ar:'يعيد تعريف' },
  'hero.title3':         { es:'tu espacio', en:'your space', zh:'您的空间', fr:'votre espace', ar:'مساحتك' },
  'hero.desc':           { es:'LumiCharge Pro carga 3 dispositivos simultáneamente con hasta 50W. Luz ambiente RGB personalizable. Diseño en aluminio anodizado que complementa cualquier escritorio.',
    en:'LumiCharge Pro charges 3 devices simultaneously with up to 50W. Customizable RGB ambient light. Anodized aluminum design that complements any desk.',
    zh:'LumiCharge Pro 可同时为3台设备充电，最高50W。可自定义RGB氛围灯。阳极氧化铝设计，搭配任何桌面。',
    fr:'LumiCharge Pro charge 3 appareils simultanément jusqu\'à 50W. Lumière ambiante RGB personnalisable. Design en aluminium anodisé qui complète tout bureau.',
    ar:'LumiCharge Pro يشحن 3 أجهزة في وقت واحد بقوة تصل إلى 50 واط. إضاءة RGB محيطة قابلة للتخصيص. تصميم من الألومنيوم المؤكسد يكمل أي مكتب.' },
  'hero.precio':         { es:'Precio', en:'Price', zh:'价格', fr:'Prix', ar:'السعر' },
  'hero.ahorras':        { es:'Ahorras', en:'You save', zh:'节省', fr:'Vous économisez', ar:'توفر' },
  'hero.stock':          { es:'Solo quedan {n} unidades', en:'Only {n} left', zh:'仅剩{n}件', fr:'Il ne reste que {n} unités', ar:'بقيت {n} قطع فقط' },
  'hero.vendidas':       { es:'vendidas esta semana', en:'sold this week', zh:'本周已售', fr:'vendues cette semaine', ar:'تم بيعها هذا الأسبوع' },
  'hero.compatible':     { es:'Compatible con:', en:'Compatible with:', zh:'兼容:', fr:'Compatible avec:', ar:'متوافق مع:' },
  'hero.add':            { es:'Añadir al carrito', en:'Add to cart', zh:'加入购物车', fr:'Ajouter au panier', ar:'أضف إلى السلة' },
  'hero.detalles':       { es:'Ver detalles', en:'See details', zh:'查看详情', fr:'Voir détails', ar:'عرض التفاصيل' },
  'hero.wishlist':       { es:'Lista de deseos', en:'Wishlist', zh:'收藏夹', fr:'Liste de souhaits', ar:'قائمة الرغبات' },
  'hero.gratis':         { es:'Envío gratis 24–48h', en:'Free shipping 24–48h', zh:'24-48小时免费送货', fr:'Livraison gratuite 24–48h', ar:'شحن مجاني 24-48 ساعة' },
  'hero.devolucion':     { es:'30 días devolución', en:'30 days return', zh:'30天退货', fr:'30 jours retour', ar:'إرجاع خلال 30 يوم' },
  'hero.garantia':       { es:'Garantía 2 años', en:'2-year warranty', zh:'2年质保', fr:'Garantie 2 ans', ar:'ضمان سنتان' },
  'hero.pago-seguro':    { es:'Pago 100% seguro', en:'100% secure payment', zh:'100%安全支付', fr:'Paiement 100% sécurisé', ar:'دفع آمن 100%' },
  'hero.encriptacion':   { es:'Encriptación AES-256', en:'AES-256 Encryption', zh:'AES-256加密', fr:'Chiffrement AES-256', ar:'تشفير AES-256' },
  'hero.gdpr':           { es:'GDPR Compliant', en:'GDPR Compliant', zh:'符合GDPR', fr:'Conforme RGPD', ar:'متوافق مع اللائحة العامة لحماية البيانات' },
  'hero.arrastra':       { es:'ARRASTRA PARA ROTAR', en:'DRAG TO ROTATE', zh:'拖动旋转', fr:'FAITES GLISSER POUR TOURNER', ar:'اسحب للتدوير' },

  // ── Features section ──
  'features.label':      { es:'Especificaciones', en:'Specifications', zh:'规格', fr:'Spécifications', ar:'المواصفات' },
  'features.title':      { es:'Tecnología que marca la diferencia', en:'Technology that makes a difference', zh:'改变格局的技术', fr:'Une technologie qui fait la différence', ar:'تقنية تصنع الفرق' },
  'features.sub':        { es:'Fabricado con materiales aeroespaciales y la más avanzada electrónica de carga.',
    en:'Made with aerospace materials and the most advanced charging electronics.',
    zh:'采用航空级材料和最先进的充电电子技术制造。',
    fr:'Fabriqué avec des matériaux aérospatiaux et l\'électronique de charge la plus avancée.',
    ar:'مصنوع من مواد فضائية وأحدث إلكترونيات الشحن.' },
  'f1.title':            { es:'Carga Rápida 50W', en:'Fast Charging 50W', zh:'50W快充', fr:'Charge Rapide 50W', ar:'شحن سريع 50 واط' },
  'f1.desc':             { es:'Compatibilidad Qi universal. Carga tu iPhone, Android y AirPods simultáneamente.', en:'Universal Qi compatibility. Charge your iPhone, Android and AirPods simultaneously.', zh:'通用Qi兼容。同时为iPhone、Android和AirPods充电。', fr:'Compatibilité Qi universelle. Chargez votre iPhone, Android et AirPods simultanément.', ar:'توافق Qi عالمي. اشحن iPhone وAndroid وAirPods في وقت واحد.' },
  'f2.title':            { es:'Luz RGB Inteligente', en:'Smart RGB Light', zh:'智能RGB灯', fr:'Lumière RGB Intelligente', ar:'إضاءة RGB ذكية' },
  'f2.desc':             { es:'16 millones de colores personalizables mediante app. Sincronización con música.', en:'16 million customizable colors via app. Synchronize with music.', zh:'通过App自定义1600万种颜色。与音乐同步。', fr:'16 millions de couleurs personnalisables via l\'app. Synchronisation avec la musique.', ar:'16 مليون لون قابل للتخصيص عبر التطبيق. مزامنة مع الموسيقى.' },
  'f3.title':            { es:'Ultra Silencioso', en:'Ultra Silent', zh:'超静音', fr:'Ultra Silencieux', ar:'فائق الهدوء' },
  'f3.desc':             { es:'Tecnología de enfriamiento pasivo. Sin ventilador, sin ruidos.', en:'Passive cooling technology. No fan, no noise.', zh:'被动散热技术。无风扇，无噪音。', fr:'Technologie de refroidissement passif. Sans ventilateur, sans bruit.', ar:'تقنية تبريد سلبية. بدون مروحة، بدون ضوضاء.' },
  'f4.title':            { es:'Aluminio Premium', en:'Premium Aluminum', zh:'高级铝合金', fr:'Aluminium Premium', ar:'ألومنيوم فاخر' },
  'f4.desc':             { es:'Cuerpo en aluminio aeroespacial 6061 anodizado. Base antideslizante.', en:'Anodized 6061 aerospace aluminum body. Non-slip base.', zh:'阳极氧化6061航空铝材机身。防滑底座。', fr:'Corps en aluminium aérospatial 6061 anodisé. Base antidérapante.', ar:'هيكل من الألومنيوم الفضائي 6061 المؤكسد. قاعدة غير قابلة للانزلاق.' },
  'f5.title':            { es:'3 Dispositivos a la vez', en:'3 Devices at Once', zh:'同时充3台设备', fr:'3 Appareils à la Fois', ar:'3 أجهزة في وقت واحد' },
  'f5.desc':             { es:'Zona de carga para smartphone, reloj inteligente y auriculares.', en:'Charging area for smartphone, smartwatch and earphones.', zh:'智能手机、智能手表和耳机的充电区域。', fr:'Zone de charge pour smartphone, montre connectée et écouteurs.', ar:'منطقة شحن للهاتف الذكي والساعة الذكية وسماعات الأذن.' },
  'f6.title':            { es:'Eficiencia Energética', en:'Energy Efficiency', zh:'能效', fr:'Efficacité Énergétique', ar:'كفاءة الطاقة' },
  'f6.desc':             { es:'Certificado Energy Star. Modo standby de 0.3W. Apagado automático.', en:'Energy Star certified. 0.3W standby mode. Auto shut-off.', zh:'能源之星认证。0.3W待机模式。自动关机。', fr:'Certifié Energy Star. Mode veille 0.3W. Arrêt automatique.', ar:'حاصل على شهادة Energy Star. وضع الاستعداد 0.3W. إيقاف تشغيل تلقائي.' },

  // ── Video ──
  'video.label':         { es:'Vélo en acción', en:'See it in action', zh:'看演示', fr:'Voyez-le en action', ar:'شاهده أثناء العمل' },
  'video.title':         { es:'Un cargador que también decora', en:'A charger that also decorates', zh:'既是充电器也是装饰品', fr:'Un chargeur qui décore aussi', ar:'شاحن يزين أيضًا' },
  'video.play':          { es:'Ver demostración', en:'Watch demo', zh:'观看演示', fr:'Voir la démo', ar:'شاهد العرض' },

  // ── Social proof ──
  'social.label':        { es:'Confianza real', en:'Real trust', zh:'真实信赖', fr:'Confiance réelle', ar:'ثقة حقيقية' },
  'social.title':        { es:'Más de 4.200 clientes satisfechos', en:'Over 4,200 satisfied customers', zh:'超过4,200位满意客户', fr:'Plus de 4.200 clients satisfaits', ar:'أكثر من 4,200 عميل راضٍ' },
  'social.valoracion':   { es:'Valoración media', en:'Average rating', zh:'平均评分', fr:'Note moyenne', ar:'متوسط التقييم' },
  'social.pedidos':      { es:'Pedidos completados', en:'Orders completed', zh:'已完成订单', fr:'Commandes complétées', ar:'الطلبات المكتملة' },
  'social.repiten':      { es:'Clientes repiten', en:'Repeat customers', zh:'回头客', fr:'Clients fidèles', ar:'عملاء يعيدون الشراء' },
  'social.envio':        { es:'Envío express', en:'Express shipping', zh:'快递配送', fr:'Livraison express', ar:'شحن سريع' },
  'social.resenas':      { es:'reseñas', en:'reviews', zh:'条评价', fr:'avis', ar:'تقييم' },
  'social.compra-verif': { es:'Compra verificada', en:'Verified purchase', zh:'已验证购买', fr:'Achat vérifié', ar:'شراء مؤكد' },

  // ── Comparison ──
  'cmp.label':           { es:'¿Por qué LumiCharge?', en:'Why LumiCharge?', zh:'为什么选择LumiCharge？', fr:'Pourquoi LumiCharge ?', ar:'لماذا LumiCharge؟' },
  'cmp.title':           { es:'Comparativa honesta con la competencia', en:'Honest comparison with competitors', zh:'与竞品的真实对比', fr:'Comparaison honnête avec la concurrence', ar:'مقارنة صادقة مع المنافسين' },

  // ── FAQ ──
  'faq.label':           { es:'Preguntas frecuentes', en:'Frequently asked questions', zh:'常见问题', fr:'Questions fréquentes', ar:'الأسئلة الشائعة' },
  'faq.title':           { es:'Todo lo que necesitas saber', en:'Everything you need to know', zh:'您需要了解的一切', fr:'Tout ce que vous devez savoir', ar:'كل ما تحتاج معرفته' },

  // ── Checkout ──
  'checkout.label':      { es:'Pago seguro', en:'Secure payment', zh:'安全支付', fr:'Paiement sécurisé', ar:'دفع آمن' },
  'checkout.title':      { es:'Completa tu pedido', en:'Complete your order', zh:'完成订单', fr:'Complétez votre commande', ar:'أكمل طلبك' },
  'checkout.resumen':    { es:'Resumen de pedido', en:'Order summary', zh:'订单摘要', fr:'Récapitulatif de la commande', ar:'ملخص الطلب' },
  'checkout.subtotal':   { es:'Subtotal', en:'Subtotal', zh:'小计', fr:'Sous-total', ar:'المجموع الفرعي' },
  'checkout.envio':      { es:'Envío', en:'Shipping', zh:'运费', fr:'Livraison', ar:'الشحن' },
  'checkout.gratis':     { es:'Gratis', en:'Free', zh:'免费', fr:'Gratuit', ar:'مجاني' },
  'checkout.total':      { es:'Total', en:'Total', zh:'总计', fr:'Total', ar:'المجموع' },
  'checkout.pagar':      { es:'Pagar con seguridad', en:'Pay securely', zh:'安全支付', fr:'Payer en toute sécurité', ar:'ادفع بأمان' },
  'checkout.nombre':     { es:'Nombre', en:'First name', zh:'名字', fr:'Prénom', ar:'الاسم' },
  'checkout.apellidos':  { es:'Apellidos', en:'Last name', zh:'姓氏', fr:'Nom de famille', ar:'اسم العائلة' },
  'checkout.email':      { es:'Email', en:'Email', zh:'邮箱', fr:'Email', ar:'البريد الإلكتروني' },
  'checkout.direccion':  { es:'Dirección de envío', en:'Shipping address', zh:'收货地址', fr:'Adresse de livraison', ar:'عنوان الشحن' },
  'checkout.ciudad':     { es:'Ciudad', en:'City', zh:'城市', fr:'Ville', ar:'المدينة' },
  'checkout.cp':         { es:'Código postal', en:'Postal code', zh:'邮政编码', fr:'Code postal', ar:'الرمز البريدي' },
  'checkout.metodo':     { es:'Método de pago', en:'Payment method', zh:'支付方式', fr:'Moyen de paiement', ar:'طريقة الدفع' },
  'checkout.tarjeta':    { es:'Datos de la tarjeta', en:'Card details', zh:'卡号信息', fr:'Coordonnées bancaires', ar:'بيانات البطاقة' },
  'checkout.seguro':     { es:'Tus datos se envían directamente a Stripe mediante iframes seguros.', en:'Your data is sent directly to Stripe via secure iframes.', zh:'您的数据通过安全iframe直接发送到Stripe。', fr:'Vos données sont envoyées directement à Stripe via des iframes sécurisés.', ar:'يتم إرسال بياناتك مباشرة إلى Stripe عبر iframes آمنة.' },
  'checkout.nota-seg':   { es:'Pago procesado por Stripe. Tus datos están encriptados con SSL 256-bit.', en:'Payment processed by Stripe. Your data is encrypted with 256-bit SSL.', zh:'支付由Stripe处理。您的数据使用256位SSL加密。', fr:'Paiement traité par Stripe. Vos données sont chiffrées avec SSL 256 bits.', ar:'تتم معالجة الدفع بواسطة Stripe. بياناتك مشفرة بتقنية SSL 256 بت.' },

  // ── Security section ──
  'sec.label':           { es:'Tu seguridad, nuestra prioridad', en:'Your security, our priority', zh:'您的安全，我们的首要任务', fr:'Votre sécurité, notre priorité', ar:'أمنك، أولويتنا' },
  'sec.title':           { es:'Compra con total tranquilidad', en:'Shop with complete peace of mind', zh:'完全放心购物', fr:'Achetez en toute tranquillité', ar:'تسوق براحة بال تامة' },

  // ── Footer ──
  'footer.tagline':      { es:'Tecnología premium para el escritorio del siglo XXI.', en:'Premium technology for the 21st century desk.', zh:'为21世纪桌面打造的优质技术。', fr:'Technologie premium pour le bureau du XXIe siècle.', ar:'تقنية فاخرة لمكتب القرن الحادي والعشرين.' },
  'footer.tienda':       { es:'Tienda', en:'Shop', zh:'商店', fr:'Boutique', ar:'المتجر' },
  'footer.soporte':      { es:'Soporte', en:'Support', zh:'支持', fr:'Assistance', ar:'الدعم' },
  'footer.legal':        { es:'Legal', en:'Legal', zh:'法律', fr:'Mentions légales', ar:'قانوني' },

  // ── Newsletter ──
  'nl.badge':            { es:'Oferta exclusiva', en:'Exclusive offer', zh:'独家优惠', fr:'Offre exclusive', ar:'عرض حصري' },
  'nl.title':            { es:'−10% extra en tu primer pedido', en:'−10% extra on your first order', zh:'首单额外10%优惠', fr:'−10% supplémentaire sur votre première commande', ar:'خصم 10% إضافي على طلبك الأول' },
  'nl.placeholder':      { es:'tu@email.com', en:'your@email.com', zh:'your@email.com', fr:'votre@email.com', ar:'بريدك@الإلكتروني.com' },

  // ── Language switcher ──
  'lang.switch':         { es:'Idioma', en:'Language', zh:'语言', fr:'Langue', ar:'اللغة' },

  // ── Cart page ──
  'cart.title':          { es:'Tu carrito', en:'Your cart', zh:'您的购物车', fr:'Votre panier', ar:'سلتك' },
  'cart.empty-title':    { es:'Tu carrito está vacío', en:'Your cart is empty', zh:'您的购物车是空的', fr:'Votre panier est vide', ar:'سلتك فارغة' },
  'cart.empty-desc':     { es:'Añade productos desde nuestra tienda para empezar.', en:'Add products from our store to get started.', zh:'从我们的商店添加产品开始。', fr:'Ajoutez des produits de notre boutique pour commencer.', ar:'أضف منتجات من متجرنا للبدء.' },
  'cart.ir-tienda':      { es:'Ir a la tienda', en:'Go to store', zh:'去商店', fr:'Aller à la boutique', ar:'اذهب إلى المتجر' },
  'cart.resumen':        { es:'Resumen', en:'Summary', zh:'摘要', fr:'Résumé', ar:'الملخص' },
  'cart.subtotal':       { es:'Subtotal', en:'Subtotal', zh:'小计', fr:'Sous-total', ar:'المجموع الفرعي' },
  'cart.envio':          { es:'Envío', en:'Shipping', zh:'运费', fr:'Livraison', ar:'الشحن' },
  'cart.gratis':         { es:'Gratis', en:'Free', zh:'免费', fr:'Gratuit', ar:'مجاني' },
  'cart.total':          { es:'Total', en:'Total', zh:'总计', fr:'Total', ar:'المجموع' },
  'cart.pagar':          { es:'Proceder al pago seguro', en:'Proceed to secure checkout', zh:'前往安全结算', fr:'Procéder au paiement sécurisé', ar:'المتابعة إلى الدفع الآمن' },
  'cart.nota-seg':       { es:'Pago 100% seguro con Stripe', en:'100% secure payment with Stripe', zh:'Stripe 100%安全支付', fr:'Paiement 100% sécurisé par Stripe', ar:'دفع آمن 100% مع Stripe' },
  'cart.seguir':         { es:'Seguir comprando', en:'Continue shopping', zh:'继续购物', fr:'Continuer vos achats', ar:'مواصلة التسوق' },
  'cart.ssl':            { es:'SSL Seguro', en:'SSL Secure', zh:'SSL安全', fr:'SSL Sécurisé', ar:'SSL آمن' },
};
