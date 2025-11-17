import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import { PaginaHome } from '@pages/paginaHome';
import { PaginaRegistro } from '@pages/paginaRegistro';
import { PaginaLogin } from '@pages/paginaLogin';
import { Helpers, type LoginResponse } from '@utils/helpers';

let paginaHome: PaginaHome;
let paginaRegistro: PaginaRegistro;
let helpers: Helpers;
let paginaLogin: PaginaLogin;

dotenv.config();

test.beforeEach(({ page }) => {
    paginaHome = new PaginaHome(page);
    paginaRegistro = new PaginaRegistro(page);
    paginaLogin = new PaginaLogin(page);
    helpers = new Helpers(page);
});

test('TC-3: Registro de estudiante (Sign up)', { tag: '@smoke' }, async ({ page }) => {
    const email = helpers.generarEmailUnico();
    await paginaHome.navegarAHome();
    await paginaHome.navegarARegistro();
    await paginaRegistro.registrarEstudiante('Juan', 'Pérez', email, 'Password123');

    // Verificar que el registro fue exitoso
    await helpers.esperarPorRespuestaAPI('/api/students/register', 'POST', 201);
    await paginaRegistro.clickButtonModalIrIniciarSesion();
    await expect(page).toHaveURL(/.*login.*/);

    // Asegurarse de que los campos estén visibles antes de llenarlos
    await expect(paginaLogin.txtBoxCorreo).toBeVisible();
    await paginaLogin.ingresarCorreo(email);
    await paginaLogin.ingresarPassword('Password123');

    // Esperar un momento para asegurar que los campos estén llenos
    await page.waitForTimeout(3000);

    // Esperar respuesta de login antes de hacer clic
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

    console.log(
        `✅ Token JWT recibido correctamente (${loginResponse.body.token.substring(0, 30)}...)`,
    );

    // NOTE: El frontend actualmente tiene un bug donde no redirige automáticamente al dashboard
    // después de un login exitoso, a pesar de recibir un token válido (200 OK).
    // Descomentar las siguientes líneas cuando el frontend sea corregido:
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 10000 });
    await helpers.verificarTextoVisible('Hola, Juan Pérez');
});
