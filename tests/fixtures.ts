import { test as base } from '@playwright/test';

// Extender el test base con un fixture personalizado
export const test = base.extend({
    page: async ({ page }, use) => {
        // Configurar el listener antes de usar la página
        const errores500: Array<{ url: string; status: number; method: string }> = [];

        page.on('response', (response) => {
            const status = response.status();
            if (status >= 500) {
                const url = response.url();
                const method = response.request().method();
                errores500.push({ url, status, method });
                
                console.error(`\n❌ ERROR ${status} detectado:`);
                console.error(`   URL: ${url}`);
                console.error(`   Método: ${method}`);
            }
        });

        // Usar la página en los tests
        await use(page);

        // Después de que el test termine, mostrar resumen de errores 500 (sin fallar el test)
        if (errores500.length > 0) {
            console.warn(`\n⚠️  RESUMEN: Se detectaron ${errores500.length} error(es) 500 durante el test:`);
            errores500.forEach((error, index) => {
                console.warn(`   ${index + 1}. ${error.method} ${error.url} → ${error.status}`);
            });
            console.warn(`   (El test continúa - estos errores son solo informativos)\n`);
        }
    },
});

// Exportar expect para mantener compatibilidad
export { expect } from '@playwright/test';

