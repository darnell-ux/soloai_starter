/**
 * Inline GTM bootstrap (container id interpolated server-side for static string only in component).
 * Escapes single quotes in container id (GTM ids do not contain quotes).
 */
export function gtmBootstrapSnippet(containerId: string): string {
	const id = containerId.trim().replace(/'/g, '');
	return `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`;
}
