import {
    Html,
    Body,
    Head,
    Heading,
    Hr,
    Img,
    Container,
    Preview,
    Section,
    Text,
    Button,
    Tailwind,
    Link
} from '@react-email/components';
import * as React from 'react';


// Parámetros de ejemplo
export default function CredencialesTemplate({
    nombreUsuario = "Juan Perez",
    correoUsuario = "juan@ejemplo.com",
    passwordGenerada = "Andesco2026*",
    urlLogin = 'https://andescoeventos.com/login'
}) {
    return (
        <Html>
            <Head />
            {/* Texto que aparece en bandeja de entrada antes de abrir el correo */}
            <Preview>Bievenido al XX Congreso Colombiano de Derecho Concursal</Preview>

            <Tailwind>
                <Body className="bg-gray-100 font-sans my-auto mx-auto px-2">
                    <Container className="bg-white border border-gray-200 rounded-lg p-8 mx-auto mt-10 mb-10 max-w-[600px]">
                        {/* Header / Logo */}

                        <Section className="text-center mt-2 mb-2">
                            <Img
                                src="https://andescoeventos.com/images/bannerCorreo.jpeg"
                                width="455"
                                height="210"
                                alt="Banner 10° Seminario Andesco"
                                className="mx-auto"
                            />
                        </Section>

                        <Section className="text-center mb-6">
                            <Heading className="text-2xl font-bold text-black-700 m-0">
                                !Bienvenido
                                {nombreUsuario}!
                            </Heading>
                            
                        </Section>

                        {/* Saludo */}
                        <Heading className="text-xl font-semibold text-gray-800">
                            ¡Hola {nombreUsuario}!
                        </Heading>
                        <Text className="text-gray-600 text-base leading-relaxed">Recuerde que el próximo 17, 18 y 19 de Septiembre de 2026 podrá ingresar al <strong>Congreso Colombiano de Derecho Concursal 2026</strong> de manera virtual.</Text>

                        <Text className="text-gray-600 text-base leading-relaxed" style={{paddingTop: 30}}>Para ingresar al seminario por favor seguir los siguientes pasos:</Text>

                        <Text className="text-gray-600 text-base leading-relaxed">Haga Click en el botón "Ingresar a la Plataforma", luego diligencie sus datos de ingreso y ¡Listo!</Text>


                        {/* Caja de Credenciales */}
                        <Section className="bg-blue-50 rounded-md p-6 my-6 text-center border border-blue-100">
                            <Text className="text-gray-800 m-0 text-base">
                                <strong>Usuario:</strong> {correoUsuario}
                            </Text>
                            <text className="text-gray-800 m-0 mt-2 text-base">
                                <strong>Contraseña</strong> <span className="font-mono bg-white px-2 py-1 rounded border border-gray-200">{passwordGenerada}</span>
                            </text>
                        </Section>

                        {/* Call to Action */}
                        <Section className="text-center mt-6 mb-6">
                            <Button
                                href={urlLogin}
                                className="bg-blue-600 text-white font-semibold py-3 px-8 rounded-md no-underline text-center block w-full max-w-[250px] mx-auto"
                            >
                                INGRESAR AL CONGRESO
                            </Button>
                        </Section>

                        <Section className="bg-[#181b21] p-6 text-center">
                            <Img
                                src="https://andescoeventos.com/logo-andesco.png"
                                width="150"
                                height="auto"
                                alt="Andesco"
                                className="mx-auto grayscale opacity-80"
                            />
                        </Section>

                        <Hr className="my-6 border-gray-200" />
                    </Container>

                    <Section className="bg-[#f4f6f8] rounded-lg p-8 mx-auto mt-10 mb-10 max-w-[600px]">
                        {/* Footer */}
                        <ul className="list-disc pl-6 text-gray-700 text-[15px] leading-[24px] mb-6">
                            <li className="mb-2">Por favor tenga en cuenta que con su usuario, solo puede conectarse por un solo dispositivo a la vez.</li>
                            <li className="mb-2">Le recomendamos conectarse unos minutos antes para que pueda revisar los requerimientos técnicos y no tenga ningún inconveniente</li>
                            <li className="mb-2">Si tiene alguna duda por favor contactarse al WhatsApp +57 3145780935</li>
                        </ul>

                        <Text className="text-xs text-gray-500 text-center leading-relaxed">
                            <br /><br />
                            www.derechoconcursal.org
                        </Text>
                    </Section>



                </Body>
            </Tailwind>
        </Html>
    )
}