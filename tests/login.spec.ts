import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import { Helpers, type LoginResponse } from '@utils/helpers';
import { PaginaLogin } from '@pages/paginaLogin';

let helpers: Helpers;
let paginaLogin: PaginaLogin;

dotenv.config();

test.beforeEach(({ page }) => {
    helpers = new Helpers(page);
    paginaLogin = new PaginaLogin(page);
});

test('TC-1: Login Exitoso', { tag: '@smoke' }, async ({ page }) => {
    const email = helpers.generarEmailUnico();
    await helpers.crearNuevoEstudiantePorApi('Juan', 'Pérez', email, 'Password123');
    await paginaLogin.navegarALogin();

    // Asegurarse de que los campos estén visibles antes de llenarlos
    await expect(paginaLogin.txtBoxCorreo).toBeVisible();
    await paginaLogin.ingresarCorreo(email);
    await paginaLogin.ingresarPassword('Password123');

    // Esperar un momento para asegurar que los campos estén llenos
    await page.waitForTimeout(3000);


    // Capturar la respuesta API antes de hacer clic para evitar race condition
    const [loginResponse] = await Promise.all([
        helpers.capturarYLoguearRespuestaAPI<LoginResponse>('/api/students/login', 'POST'),
        paginaLogin.clickBotonIniciarSesion(),
    ]);

    // Verificar que el login fue exitoso
    expect(loginResponse.status).toBe(200);

    // Verificar que la respuesta contiene un token válido
    expect(loginResponse.body).toHaveProperty('token');
    expect(loginResponse.body.token).toBeTruthy();
    expect(typeof loginResponse.body.token).toBe('string');
    expect(loginResponse.body.token.length).toBeGreaterThan(0);

    // Verificar que el token tiene formato JWT (3 partes separadas por punto)
    const tokenParts = loginResponse.body.token.split('.');
    expect(tokenParts.length).toBe(3);

    console.log(`✅ Token JWT recibido correctamente (${loginResponse.body.token.substring(0, 30)}...)`);

    // NOTE: El frontend actualmente tiene un bug donde no redirige automáticamente al dashboard
    // después de un login exitoso, a pesar de recibir un token válido (200 OK).
    // Descomentar la siguiente línea cuando el frontend sea corregido:
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 10000 });
});
