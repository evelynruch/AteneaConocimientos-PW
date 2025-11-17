import { expect, Page, type Response } from '@playwright/test';

export interface APIResponse<T = unknown> {
    response: Response;
    status: number;
    body: T;
}

export interface LoginResponse {
    token: string;
    student?: {
        id: string;
        name: string;
        lastname: string;
        email: string;
    };
}

export class Helpers {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    // Generar email único combinando timestamp con random para evitar duplicados
    generarEmailUnico(): string {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        return `estudiante${timestamp}${random}@automation.com`;
    }

    private getBaseURL(): string {
        const raw =
            process.env.PLAYWRIGHT_TEST_BASE_URL ||
            process.env.BASE_URL ||
            'https://qa.ateneaconocimientos.com';

        let url: URL;
        try {
            url = raw.startsWith('http') ? new URL(raw) : new URL(`https://${raw}`);
        } catch {
            url = new URL('https://qa.ateneaconocimientos.com');
        }
        url.protocol = 'https:';
        return url.origin;
    }

    //Verificar que el elemento buscado por texto esté visible en la página
    async verificarTextoVisible(texto: string) {
        const elemento = this.page.getByText(texto);
        await expect(elemento).toBeVisible();
    }

    async esperarPorRespuestaAPI(url: string, metodo: string, status: number) {
        await this.page.waitForResponse(
            (response) =>
                response.url().includes(url) &&
                response.request().method() === metodo &&
                response.status() === status,
        );
    }

    async capturarYLoguearRespuestaAPI<T = unknown>(
        url: string,
        metodo: string,
    ): Promise<APIResponse<T>> {
        const response = await this.page.waitForResponse(
            (response) => response.url().includes(url) && response.request().method() === metodo,
            { timeout: 30000 }, // Aumentar timeout a 30 segundos
        );

        const responseStatus = response.status();
        let responseBody: T;

        try {
            responseBody = (await response.json()) as T;
        } catch {
            responseBody = (await response.text()) as T;
        }

        console.log(`\n=== Respuesta API ===`);
        console.log(`URL: ${response.url()}`);
        console.log(`Método: ${metodo}`);
        console.log(`Status: ${responseStatus}`);
        console.log(`Body:`, responseBody);
        console.log(`===================\n`);

        return { response, status: responseStatus, body: responseBody };
    }

    //Crear un nuevo estudiante mediante la API y verificar la respuesta
    async crearNuevoEstudiantePorApi(
        nombre: string,
        apellido: string,
        email: string,
        password: string,
    ) {
        const payload = {
            name: nombre,
            lastname: apellido, // <- minúsculas
            email,
            password,
        };

        const url = new URL('/api/students/register', this.getBaseURL()).toString();
        const response = await this.page.request.post(url, { data: payload });

        const status = response.status();
        if (status !== 201) {
            const body = await response.text();
            throw new Error(
                `Fallo al registrar estudiante. status=${status}. respuesta=${body}. payload=${JSON.stringify({ ...payload, password: '***' })}`,
            );
        }
    }
}
