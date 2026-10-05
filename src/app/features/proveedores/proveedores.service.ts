import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { map, Observable, of, throwError } from 'rxjs';
import {
  getApiResponseData,
  isApiResponse,
  isPageResponse,
  PageResponse,
} from '../../core/models/api-response.model';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { isProveedorPage, NuevoProveedor, Proveedor } from './proveedor.model';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const DEMO_PROVEEDORES: Proveedor[] = [
  {
    id: 'demo-1',
    ruc: '20609829045',
    razonSocial: 'SERVICIOS GENERALES MIROMAT E.I.R.L',
    direccion: 'OTR.MIRADOR CUMBAZA N° B3 DPTO.B3 CND.MIRADOR CUMBAZA SAN MARTÍN TARAPOTO',
    telefono: null,
    correo: null,
  },
  {
    id: 'demo-2',
    ruc: '20601807816',
    razonSocial: 'SMG CONSULTORES Y CONTRATISTAS GENERALES S.A.C.',
    direccion: 'JR. ABANCAY 298 - TARAPOTO',
    telefono: null,
    correo: null,
  },
  {
    id: 'demo-3',
    ruc: '20500000001',
    razonSocial: 'SUPPLIES & LOGISTIC PERU S.A.C.',
    direccion: 'CANADA 665 URB. SANTA CATALINA - LA VICTORIA - LIMA',
    telefono: '994056614',
    correo: null,
  },
  {
    id: 'demo-4',
    ruc: '20806158383',
    razonSocial: 'THE WONDER BUSINESS S.A.C.',
    direccion: 'JR. ALONSO DE ALVARADO N° 752 TARAPOTO',
    telefono: '842885770',
    correo: null,
  },
  {
    id: 'demo-5',
    ruc: '20160766191',
    razonSocial: 'UNSM - ALMACEN CENTRAL',
    direccion: 'JR. MAYNAS N° 179 TARAPOTO',
    telefono: null,
    correo: null,
  },
  {
    id: 'demo-6',
    ruc: '20500000002',
    razonSocial: 'V&D MUBISE E.I.R.L.',
    direccion: 'JR. LA PAZ C2',
    telefono: null,
    correo: null,
  },
  {
    id: 'demo-7',
    ruc: '20500000003',
    razonSocial: 'COMERCIALIZADORA EL ROBLE S.A.C.',
    direccion: 'AV. MORALES DUAREZ 456 - TARAPOTO',
    telefono: '993456789',
    correo: 'ventas@elroble.com',
  },
  {
    id: 'demo-8',
    ruc: '20500000004',
    razonSocial: 'DISTRIBUIDORA NORTE S.A.',
    direccion: 'CALLE LIMA 789 - TARAPOTO',
    telefono: '994567890',
    correo: 'contacto@distnorte.com',
  },
  {
    id: 'demo-9',
    ruc: '20500000005',
    razonSocial: 'INVERSIONES PACIFICO E.I.R.L.',
    direccion: 'JR. SAN MARTIN 321 - TARAPOTO',
    telefono: null,
    correo: 'info@pacifico.com',
  },
  {
    id: 'demo-10',
    ruc: '20500000006',
    razonSocial: 'TECNOLOGIA AVANZADA S.A.C.',
    direccion: 'AV. CENTRAL 1000 - TARAPOTO',
    telefono: '995678901',
    correo: 'soporte@tecnoavanzada.com',
  },
  {
    id: 'demo-11',
    ruc: '20500000007',
    razonSocial: 'AGROINDUSTRIAL SELVA S.A.',
    direccion: 'KM 5 CARRETERA FERNANDO BELAUNDE TERRY - TARAPOTO',
    telefono: '996789012',
    correo: 'ventas@agroselva.com',
  },
  {
    id: 'demo-12',
    ruc: '20500000008',
    razonSocial: 'CONSTRUCTORA AMAZONAS S.A.C.',
    direccion: 'JR. LORETO 555 - TARAPOTO',
    telefono: null,
    correo: 'proyectos@amazonas.com',
  },
  {
    id: 'demo-13',
    ruc: '20500000009',
    razonSocial: 'TRANSPORTES SELVA EXPRESS E.I.R.L.',
    direccion: 'AV. DEL EJERCITO 234 - TARAPOTO',
    telefono: '997890123',
    correo: null,
  },
  {
    id: 'demo-14',
    ruc: '20500000010',
    razonSocial: 'FARMACIA SAN MARTIN S.A.C.',
    direccion: 'JR. MAYNAS 456 - TARAPOTO',
    telefono: '998901234',
    correo: 'ventas@fsm.com',
  },
  {
    id: 'demo-15',
    ruc: '20500000011',
    razonSocial: 'LIBRERIA UNIVERSAL E.I.R.L.',
    direccion: 'JR. LIMA 123 - TARAPOTO',
    telefono: null,
    correo: 'pedidos@libreriauniversal.com',
  },
  {
    id: 'demo-16',
    ruc: '20500000012',
    razonSocial: 'TEXTILES LA COSTURA S.A.C.',
    direccion: 'CALLE SAN MARTIN 789 - TARAPOTO',
    telefono: '999012345',
    correo: 'ventas@textilescostura.com',
  },
  {
    id: 'demo-17',
    ruc: '20500000013',
    razonSocial: 'ALIMENTOS NATURALES S.A.',
    direccion: 'AV. TARAPOTO 100 - TARAPOTO',
    telefono: null,
    correo: 'info@alimentosnaturales.com',
  },
  {
    id: 'demo-18',
    ruc: '20500000014',
    razonSocial: 'ELECTRONICA MODERNA E.I.R.L.',
    direccion: 'JR. ABANCAY 567 - TARAPOTO',
    telefono: '990123456',
    correo: 'servicio@elecmoderna.com',
  },
  {
    id: 'demo-19',
    ruc: '20500000015',
    razonSocial: 'PAPELERIA EL ESTUDIANTE S.A.C.',
    direccion: 'JR. LORETO 890 - TARAPOTO',
    telefono: null,
    correo: 'ventas@papelestudiante.com',
  },
  {
    id: 'demo-20',
    ruc: '20500000016',
    razonSocial: 'MUEBLES Y DECORACIONES S.A.',
    direccion: 'AV. MORALES DUAREZ 1000 - TARAPOTO',
    telefono: '991234567',
    correo: 'ventas@mueblesyDecoraciones.com',
  },
  {
    id: 'demo-21',
    ruc: '20500000017',
    razonSocial: 'QUIMICA INDUSTRIAL DEL ORIENTE S.A.C.',
    direccion: 'CALLE LOS PINOS 234 - TARAPOTO',
    telefono: null,
    correo: 'info@quimicaoriente.com',
  },
  {
    id: 'demo-22',
    ruc: '20500000018',
    razonSocial: 'CALZADO FASHION E.I.R.L.',
    direccion: 'JR. SAN MARTIN 456 - TARAPOTO',
    telefono: '992345678',
    correo: 'ventas@calzadofashion.com',
  },
  {
    id: 'demo-23',
    ruc: '20500000019',
    razonSocial: 'FERRETERIA EL MAESTRO S.A.C.',
    direccion: 'AV. DEL EJERCITO 567 - TARAPOTO',
    telefono: null,
    correo: 'pedidos@ferreteriaelmaestro.com',
  },
  {
    id: 'demo-24',
    ruc: '20500000020',
    razonSocial: 'IMPRESIONES GRAFICAS S.A.',
    direccion: 'JR. LIMA 789 - TARAPOTO',
    telefono: '993456780',
    correo: 'info@impresionesgraficas.com',
  },
  {
    id: 'demo-25',
    ruc: '20500000021',
    razonSocial: 'CARNES Y EMBUTIDOS S.A.C.',
    direccion: 'CALLE LORETO 123 - TARAPOTO',
    telefono: null,
    correo: 'ventas@carnesyembutidos.com',
  },
  {
    id: 'demo-26',
    ruc: '20500000022',
    razonSocial: 'LÁCTEOS LA GRANJA E.I.R.L.',
    direccion: 'JR. MAYNAS 345 - TARAPOTO',
    telefono: '994567891',
    correo: 'info@lacteoslagranja.com',
  },
  {
    id: 'demo-27',
    ruc: '20500000023',
    razonSocial: 'PANADERIA EL TRIGO S.A.C.',
    direccion: 'AV. CENTRAL 456 - TARAPOTO',
    telefono: null,
    correo: 'ventas@panaderiaeltrigo.com',
  },
  {
    id: 'demo-28',
    ruc: '20500000024',
    razonSocial: 'BEBIDAS REFRESCANTES S.A.',
    direccion: 'JR. ABANCAY 678 - TARAPOTO',
    telefono: '995678902',
    correo: 'info@bebidasrefrescantes.com',
  },
  {
    id: 'demo-29',
    ruc: '20500000025',
    razonSocial: 'JUGOS Y FRUTAS NATURALES E.I.R.L.',
    direccion: 'CALLE SAN MARTIN 901 - TARAPOTO',
    telefono: null,
    correo: 'ventas@jugosyfrutas.com',
  },
  {
    id: 'demo-30',
    ruc: '20500000026',
    razonSocial: 'CERAMICA ARTESANAL S.A.C.',
    direccion: 'JR. LORETO 234 - TARAPOTO',
    telefono: '996789013',
    correo: 'info@ceramicaartesanal.com',
  },
  {
    id: 'demo-31',
    ruc: '20500000027',
    razonSocial: 'ARTESANIAS REGIONALES S.A.',
    direccion: 'AV. MORALES DUAREZ 567 - TARAPOTO',
    telefono: null,
    correo: 'ventas@artesaniasregionales.com',
  },
  {
    id: 'demo-32',
    ruc: '20500000028',
    razonSocial: 'JOYERIA Y RELOJERIA E.I.R.L.',
    direccion: 'JR. LIMA 345 - TARAPOTO',
    telefono: '997890124',
    correo: 'info@joyeriayrelojeria.com',
  },
  {
    id: 'demo-33',
    ruc: '20500000029',
    razonSocial: 'OPTICA VISIÓN S.A.C.',
    direccion: 'CALLE MAYNAS 678 - TARAPOTO',
    telefono: null,
    correo: 'citas@optica vision.com',
  },
  {
    id: 'demo-34',
    ruc: '20500000030',
    razonSocial: 'CLINICA DENTAL SONRISA S.A.',
    direccion: 'AV. DEL EJERCITO 789 - TARAPOTO',
    telefono: '998901235',
    correo: 'info@clinicadental sonrisa.com',
  },
  {
    id: 'demo-35',
    ruc: '20500000031',
    razonSocial: 'LABORATORIO CLINICO S.A.C.',
    direccion: 'JR. ABANCAY 901 - TARAPOTO',
    telefono: null,
    correo: 'resultados@laboratorioclinico.com',
  },
  {
    id: 'demo-36',
    ruc: '20500000032',
    razonSocial: 'FARMACIA SALUD TOTAL E.I.R.L.',
    direccion: 'CALLE LORETO 123 - TARAPOTO',
    telefono: '999012346',
    correo: 'ventas@farmaciasaludtotal.com',
  },
  {
    id: 'demo-37',
    ruc: '20500000033',
    razonSocial: 'MATERIAL DE CONSTRUCCION S.A.',
    direccion: 'AV. TARAPOTO 456 - TARAPOTO',
    telefono: null,
    correo: 'pedidos@materialdeconstruccion.com',
  },
  {
    id: 'demo-38',
    ruc: '20500000034',
    razonSocial: 'PINTURAS Y ACABADOS S.A.C.',
    direccion: 'JR. SAN MARTIN 567 - TARAPOTO',
    telefono: '990123457',
    correo: 'info@pinturasyacabados.com',
  },
  {
    id: 'demo-39',
    ruc: '20500000035',
    razonSocial: 'ELECTRICIDAD INDUSTRIAL E.I.R.L.',
    direccion: 'CALLE LOS PINOS 789 - TARAPOTO',
    telefono: null,
    correo: 'servicio@electricidadindustrial.com',
  },
  {
    id: 'demo-40',
    ruc: '20500000036',
    razonSocial: 'PLOMERIA Y GAS S.A.C.',
    direccion: 'JR. LIMA 234 - TARAPOTO',
    telefono: '991234568',
    correo: 'info@plomeriaygas.com',
  },
  {
    id: 'demo-41',
    ruc: '20500000037',
    razonSocial: 'CARPINTERIA MADERA FINA S.A.',
    direccion: 'AV. CENTRAL 567 - TARAPOTO',
    telefono: null,
    correo: 'ventas@carpinteriamaderafina.com',
  },
  {
    id: 'demo-42',
    ruc: '20500000038',
    razonSocial: 'SERVICIOS DE LIMPIEZA E.I.R.L.',
    direccion: 'CALLE MAYNAS 890 - TARAPOTO',
    telefono: '992345679',
    correo: 'info@serviciosdelimpieza.com',
  },
  {
    id: 'demo-43',
    ruc: '20500000039',
    razonSocial: 'SEGURIDAD PRIVADA S.A.C.',
    direccion: 'JR. ABANCAY 123 - TARAPOTO',
    telefono: null,
    correo: 'contacto@seguridadprivada.com',
  },
  {
    id: 'demo-44',
    ruc: '20500000040',
    razonSocial: 'JARDINERIA Y PAISAJISMO S.A.',
    direccion: 'AV. MORALES DUAREZ 345 - TARAPOTO',
    telefono: '993456781',
    correo: 'info@jardineriaypaisajismo.com',
  },
  {
    id: 'demo-45',
    ruc: '20500000041',
    razonSocial: 'FLORISTERIA Y REGALOS E.I.R.L.',
    direccion: 'CALLE LORETO 456 - TARAPOTO',
    telefono: null,
    correo: 'ventas@floristeriayregalos.com',
  },
  {
    id: 'demo-46',
    ruc: '20500000042',
    razonSocial: 'MASCOTAS Y VETERINARIA S.A.C.',
    direccion: 'JR. SAN MARTIN 678 - TARAPOTO',
    telefono: '994567892',
    correo: 'info@mascotasyveterinaria.com',
  },
  {
    id: 'demo-47',
    ruc: '20500000043',
    razonSocial: 'ACUARIOS Y PECES TROPICALES E.I.R.L.',
    direccion: 'AV. DEL EJERCITO 901 - TARAPOTO',
    telefono: null,
    correo: 'ventas@acuariosypeces.com',
  },
  {
    id: 'demo-48',
    ruc: '20500000044',
    razonSocial: 'SEMILLOS Y AGRICULTURA S.A.',
    direccion: 'CALLE MAYNAS 234 - TARAPOTO',
    telefono: '995678903',
    correo: 'info@semillosyagricultura.com',
  },
  {
    id: 'demo-49',
    ruc: '20500000045',
    razonSocial: 'MAQUINARIA AGRICOLA S.A.C.',
    direccion: 'JR. LIMA 567 - TARAPOTO',
    telefono: null,
    correo: 'servicio@maquinariaagricola.com',
  },
  {
    id: 'demo-50',
    ruc: '20500000046',
    razonSocial: 'FERTILIZANTES Y QUIMICOS E.I.R.L.',
    direccion: 'AV. TARAPOTO 789 - TARAPOTO',
    telefono: '996789014',
    correo: 'ventas@fertilizantesquimicos.com',
  },
  {
    id: 'demo-51',
    ruc: '20500000047',
    razonSocial: 'SEMILLAS CERTIFICADAS S.A.',
    direccion: 'CALLE ABANCAY 123 - TARAPOTO',
    telefono: null,
    correo: 'info@semillascertificadas.com',
  },
  {
    id: 'demo-52',
    ruc: '20500000048',
    razonSocial: 'RIEGOS Y SISTEMAS S.A.C.',
    direccion: 'JR. LORETO 345 - TARAPOTO',
    telefono: '997890125',
    correo: 'info@riegosysistemas.com',
  },
  {
    id: 'demo-53',
    ruc: '20500000049',
    razonSocial: 'INVERNADEROS Y VIVEROS E.I.R.L.',
    direccion: 'AV. CENTRAL 456 - TARAPOTO',
    telefono: null,
    correo: 'ventas@invernaderosyviveros.com',
  },
  {
    id: 'demo-54',
    ruc: '20500000050',
    razonSocial: 'PISCICULTURA Y ACUICULTURA S.A.',
    direccion: 'CALLE SAN MARTIN 567 - TARAPOTO',
    telefono: '998901236',
    correo: 'info@pisciculturayacicultura.com',
  },
  {
    id: 'demo-55',
    ruc: '20500000051',
    razonSocial: 'GANADERIA Y CRIA E.I.R.L.',
    direccion: 'JR. MAYNAS 678 - TARAPOTO',
    telefono: null,
    correo: 'ventas@ganaderiaycria.com',
  },
  {
    id: 'demo-56',
    ruc: '20500000052',
    razonSocial: 'AVICULTURA Y HUEVOS S.A.C.',
    direccion: 'AV. MORALES DUAREZ 789 - TARAPOTO',
    telefono: '999012347',
    correo: 'info@aviculturayhuevos.com',
  },
  {
    id: 'demo-57',
    ruc: '20500000053',
    razonSocial: 'APICULTURA Y MIEL E.I.R.L.',
    direccion: 'CALLE LIMA 901 - TARAPOTO',
    telefono: null,
    correo: 'ventas@apiculturaymiel.com',
  },
  {
    id: 'demo-58',
    ruc: '20500000054',
    razonSocial: 'SERICICULTURA Y SEDA S.A.',
    direccion: 'JR. ABANCAY 234 - TARAPOTO',
    telefono: '990123458',
    correo: 'info@sericulturayseda.com',
  },
  {
    id: 'demo-59',
    ruc: '20500000055',
    razonSocial: 'FLORICULTURA Y ORNAMENTALES E.I.R.L.',
    direccion: 'AV. DEL EJERCITO 345 - TARAPOTO',
    telefono: null,
    correo: 'ventas@floriculturayornamentales.com',
  },
  {
    id: 'demo-60',
    ruc: '20500000056',
    razonSocial: 'FRUTAS Y VERDURAS S.A.C.',
    direccion: 'CALLE LORETO 456 - TARAPOTO',
    telefono: '991234569',
    correo: 'info@frutasyverduras.com',
  },
  {
    id: 'demo-61',
    ruc: '20500000057',
    razonSocial: 'GRANOS Y CEREALES E.I.R.L.',
    direccion: 'JR. SAN MARTIN 567 - TARAPOTO',
    telefono: null,
    correo: 'ventas@granosycereales.com',
  },
  {
    id: 'demo-62',
    ruc: '20500000058',
    razonSocial: 'ACEITES Y GRASAS S.A.',
    direccion: 'AV. CENTRAL 678 - TARAPOTO',
    telefono: '992345680',
    correo: 'info@aceitesygrasas.com',
  },
  {
    id: 'demo-63',
    ruc: '20500000059',
    razonSocial: 'CONSERVAS Y ENLATADOS E.I.R.L.',
    direccion: 'CALLE MAYNAS 789 - TARAPOTO',
    telefono: null,
    correo: 'ventas@conservasyenlatados.com',
  },
  {
    id: 'demo-64',
    ruc: '20500000060',
    razonSocial: 'DULCES Y CONFITES S.A.C.',
    direccion: 'JR. LIMA 901 - TARAPOTO',
    telefono: '993456782',
    correo: 'info@dulcesyconfites.com',
  },
  {
    id: 'demo-65',
    ruc: '20500000061',
    razonSocial: 'SNACKS Y BOTANAS E.I.R.L.',
    direccion: 'AV. TARAPOTO 123 - TARAPOTO',
    telefono: null,
    correo: 'ventas@snacksybotanas.com',
  },
  {
    id: 'demo-66',
    ruc: '20500000062',
    razonSocial: 'CHOCOLATES Y DULCES S.A.',
    direccion: 'CALLE ABANCAY 234 - TARAPOTO',
    telefono: '994567893',
    correo: 'info@chocolatesydulces.com',
  },
  {
    id: 'demo-67',
    ruc: '20500000063',
    razonSocial: 'GALLETAS Y PASTELILLOS E.I.R.L.',
    direccion: 'JR. LORETO 345 - TARAPOTO',
    telefono: null,
    correo: 'ventas@galletasypastelillos.com',
  },
  {
    id: 'demo-68',
    ruc: '20500000064',
    razonSocial: 'TORTILLAS Y PANES S.A.C.',
    direccion: 'AV. MORALES DUAREZ 456 - TARAPOTO',
    telefono: '995678904',
    correo: 'info@tortillasypanes.com',
  },
  {
    id: 'demo-69',
    ruc: '20500000065',
    razonSocial: 'HELADOS Y POSTRES E.I.R.L.',
    direccion: 'CALLE SAN MARTIN 567 - TARAPOTO',
    telefono: null,
    correo: 'ventas@heladospostres.com',
  },
  {
    id: 'demo-70',
    ruc: '20500000066',
    razonSocial: 'CAFÉ Y TE S.A.',
    direccion: 'JR. MAYNAS 678 - TARAPOTO',
    telefono: '996789015',
    correo: 'info@cafeyte.com',
  },
  {
    id: 'demo-71',
    ruc: '20500000067',
    razonSocial: 'INFUSIONES Y HIERBAS E.I.R.L.',
    direccion: 'AV. DEL EJERCITO 789 - TARAPOTO',
    telefono: null,
    correo: 'ventas@infusionesyhierbas.com',
  },
  {
    id: 'demo-72',
    ruc: '20500000068',
    razonSocial: 'JUGOS Y BEBIDAS NATURALES S.A.C.',
    direccion: 'CALLE LIMA 901 - TARAPOTO',
    telefono: '997890126',
    correo: 'info@jugosybebidas.com',
  },
  {
    id: 'demo-73',
    ruc: '20500000069',
    razonSocial: 'AGUA Y REFRESCOS E.I.R.L.',
    direccion: 'JR. ABANCAY 123 - TARAPOTO',
    telefono: null,
    correo: 'ventas@aguayrefrescos.com',
  },
  {
    id: 'demo-74',
    ruc: '20500000070',
    razonSocial: 'CERVEZAS Y MALTA S.A.',
    direccion: 'AV. CENTRAL 234 - TARAPOTO',
    telefono: '998901237',
    correo: 'info@cervezaymalta.com',
  },
  {
    id: 'demo-75',
    ruc: '20500000071',
    razonSocial: 'VINOS Y LICORES E.I.R.L.',
    direccion: 'CALLE LORETO 345 - TARAPOTO',
    telefono: null,
    correo: 'ventas@vinosylicores.com',
  },
  {
    id: 'demo-76',
    ruc: '20500000072',
    razonSocial: 'LICORES Y DESTILADOS S.A.C.',
    direccion: 'JR. SAN MARTIN 456 - TARAPOTO',
    telefono: '999012348',
    correo: 'info@licoresydestilados.com',
  },
  {
    id: 'demo-77',
    ruc: '20500000073',
    razonSocial: 'WHISKY Y RON E.I.R.L.',
    direccion: 'AV. MORALES DUAREZ 567 - TARAPOTO',
    telefono: null,
    correo: 'ventas@whiskyron.com',
  },
  {
    id: 'demo-78',
    ruc: '20500000074',
    razonSocial: 'TEQUILA Y MEZCAL S.A.',
    direccion: 'CALLE MAYNAS 678 - TARAPOTO',
    telefono: '990123459',
    correo: 'info@tequilaymezcal.com',
  },
  {
    id: 'demo-79',
    ruc: '20500000075',
    razonSocial: 'PISCO Y CHICHA E.I.R.L.',
    direccion: 'JR. LIMA 789 - TARAPOTO',
    telefono: null,
    correo: 'ventas@piscoychicha.com',
  },
  {
    id: 'demo-80',
    ruc: '20500000076',
    razonSocial: 'SANGRIA Y VINOS S.A.C.',
    direccion: 'AV. TARAPOTO 901 - TARAPOTO',
    telefono: '991234570',
    correo: 'info@sangriayvinos.com',
  },
  {
    id: 'demo-81',
    ruc: '20500000077',
    razonSocial: 'COCTELERIA Y BAR E.I.R.L.',
    direccion: 'CALLE ABANCAY 123 - TARAPOTO',
    telefono: null,
    correo: 'ventas@cocteleriaybar.com',
  },
  {
    id: 'demo-82',
    ruc: '20500000078',
    razonSocial: 'RESTAURANTE Y GASTRONOMIA S.A.',
    direccion: 'JR. LORETO 234 - TARAPOTO',
    telefono: '992345681',
    correo: 'info@restauranteygastronomia.com',
  },
  {
    id: 'demo-83',
    ruc: '20500000079',
    razonSocial: 'POLLERIA Y PARRILLAS E.I.R.L.',
    direccion: 'AV. CENTRAL 345 - TARAPOTO',
    telefono: null,
    correo: 'ventas@polleriayparrillas.com',
  },
  {
    id: 'demo-84',
    ruc: '20500000080',
    razonSocial: 'CEVICHERIA Y MARISCOS S.A.C.',
    direccion: 'CALLE SAN MARTIN 456 - TARAPOTO',
    telefono: '993456783',
    correo: 'info@cevicheriaymariscos.com',
  },
  {
    id: 'demo-85',
    ruc: '20500000081',
    razonSocial: 'SUSHI Y COMIDA JAPONESA E.I.R.L.',
    direccion: 'JR. MAYNAS 567 - TARAPOTO',
    telefono: null,
    correo: 'ventas@sushiycomidajaponesa.com',
  },
  {
    id: 'demo-86',
    ruc: '20500000082',
    razonSocial: 'COMIDA CHINA S.A.',
    direccion: 'AV. MORALES DUAREZ 678 - TARAPOTO',
    telefono: '994567894',
    correo: 'info@comidachina.com',
  },
  {
    id: 'demo-87',
    ruc: '20500000083',
    razonSocial: 'COMIDA MEXICANA E.I.R.L.',
    direccion: 'CALLE LIMA 789 - TARAPOTO',
    telefono: null,
    correo: 'ventas@comidamexicana.com',
  },
  {
    id: 'demo-88',
    ruc: '20500000084',
    razonSocial: 'COMIDA ITALIANA S.A.C.',
    direccion: 'JR. ABANCAY 901 - TARAPOTO',
    telefono: '995678905',
    correo: 'info@comidaitaliana.com',
  },
  {
    id: 'demo-89',
    ruc: '20500000085',
    razonSocial: 'COMIDA PERUANA E.I.R.L.',
    direccion: 'AV. DEL EJERCITO 123 - TARAPOTO',
    telefono: null,
    correo: 'ventas@comidaperuana.com',
  },
  {
    id: 'demo-90',
    ruc: '20500000086',
    razonSocial: 'COMIDA VEGETARIANA S.A.',
    direccion: 'CALLE LORETO 234 - TARAPOTO',
    telefono: '996789016',
    correo: 'info@comidavegetariana.com',
  },
  {
    id: 'demo-91',
    ruc: '20500000087',
    razonSocial: 'COMIDA VEGANA E.I.R.L.',
    direccion: 'JR. SAN MARTIN 345 - TARAPOTO',
    telefono: null,
    correo: 'ventas@comidavegana.com',
  },
  {
    id: 'demo-92',
    ruc: '20500000088',
    razonSocial: 'COMIDA RAPIDA S.A.C.',
    direccion: 'AV. CENTRAL 456 - TARAPOTO',
    telefono: '997890127',
    correo: 'info@comidarapida.com',
  },
  {
    id: 'demo-93',
    ruc: '20500000089',
    razonSocial: 'PIZZERIA Y PASTA E.I.R.L.',
    direccion: 'CALLE MAYNAS 567 - TARAPOTO',
    telefono: null,
    correo: 'ventas@pizzeriaypasta.com',
  },
  {
    id: 'demo-94',
    ruc: '20500000090',
    razonSocial: 'HAMBURGUESAS Y SANDWICHES S.A.',
    direccion: 'JR. LIMA 678 - TARAPOTO',
    telefono: '998901238',
    correo: 'info@hamburguesasysandwiches.com',
  },
  {
    id: 'demo-95',
    ruc: '20500000091',
    razonSocial: 'TACOS Y BURRITOS E.I.R.L.',
    direccion: 'AV. TARAPOTO 789 - TARAPOTO',
    telefono: null,
    correo: 'ventas@tacosyburritos.com',
  },
  {
    id: 'demo-96',
    ruc: '20500000092',
    razonSocial: 'EMPANADAS Y TEQUEÑOS S.A.C.',
    direccion: 'CALLE ABANCAY 901 - TARAPOTO',
    telefono: '999012349',
    correo: 'info@empanadasytequenos.com',
  },
  {
    id: 'demo-97',
    ruc: '20500000093',
    razonSocial: 'AREPAS Y CACHAPAS E.I.R.L.',
    direccion: 'JR. LORETO 123 - TARAPOTO',
    telefono: null,
    correo: 'ventas@arepasycachapas.com',
  },
  {
    id: 'demo-98',
    ruc: '20500000094',
    razonSocial: 'SALTEÑOS Y HUMINTAS S.A.',
    direccion: 'AV. MORALES DUAREZ 234 - TARAPOTO',
    telefono: '990123460',
    correo: 'info@saltenoshumintas.com',
  },
  {
    id: 'demo-99',
    ruc: '20500000095',
    razonSocial: 'TAMALES Y PASTEL DE ARROZ E.I.R.L.',
    direccion: 'CALLE SAN MARTIN 345 - TARAPOTO',
    telefono: null,
    correo: 'ventas@tamalesypasteldearroz.com',
  },
  {
    id: 'demo-100',
    ruc: '20500000096',
    razonSocial: 'CHUPE Y SOPAS S.A.C.',
    direccion: 'JR. MAYNAS 456 - TARAPOTO',
    telefono: '991234571',
    correo: 'info@chupeysopas.com',
  },
];

@Service()
export class ProveedoresService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly endpoint = `${environment.apiUrl}/proveedores`;
  private readonly demoProveedores = signal<Proveedor[]>(DEMO_PROVEEDORES);
  private nextDemoId = DEMO_PROVEEDORES.length + 1;

  readonly puedeModificar = computed<boolean>(() =>
    this.authService.isDemoMode() ||
    this.authService.isAdmin() ||
    this.authService.hasModule('PROVEEDORES') ||
    this.authService.canAccessModule('PROVEEDORES')
  );

  readonly puedeEliminar = computed<boolean>(() =>
    this.authService.isDemoMode() ||
    this.authService.isAdmin()
  );

  obtenerPagina(page: number, size: number, filtro?: string): Observable<PageResponse<Proveedor>> {
    if (this.authService.isDemoMode()) {
      let proveedores = this.demoProveedores();
      if (filtro && filtro.trim()) {
        const term = filtro.trim().toLowerCase();
        proveedores = proveedores.filter((item) => {
          const ruc = String(item.ruc ?? '').toLowerCase();
          const razonSocial = String(item.razonSocial ?? '').toLowerCase();
          const correo = String(item.correo ?? '').toLowerCase();
          const contacto = String(item.contacto ?? '').toLowerCase();
          return ruc.includes(term) || razonSocial.includes(term) || correo.includes(term) || contacto.includes(term);
        });
      }

      const totalPages = Math.ceil(proveedores.length / size) || 1;
      const content = proveedores.slice(page * size, (page + 1) * size);

      return of({
        content,
        page,
        number: page,
        size,
        totalElements: proveedores.length,
        totalPages,
        first: page === 0,
        last: page + 1 >= totalPages,
        numberOfElements: content.length,
        empty: content.length === 0,
      });
    }

    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (filtro && filtro.trim()) {
      params = params.set('filtro', filtro.trim());
    }

    return this.http
      .get<unknown>(this.endpoint, { params })
      .pipe(map((response) => this.normalizarPagina(response, page, size)));
  }

  registrar(proveedor: NuevoProveedor): Observable<void> {
    if (this.authService.isDemoMode()) {
      const duplicado = this.demoProveedores().some(
        (item) => String(item.ruc ?? '') === proveedor.ruc,
      );
      if (duplicado) {
        return throwError(
          () => new Error(`Ya existe un proveedor con RUC ${proveedor.ruc}.`),
        );
      }

      this.demoProveedores.update((proveedores) => [
        {
          id: `demo-${this.nextDemoId++}`,
          ruc: proveedor.ruc,
          razonSocial: proveedor.razonSocial,
          direccion: proveedor.direccion,
          telefono: proveedor.telefono,
          correo: proveedor.correo,
          contacto: proveedor.contacto,
          banco: proveedor.banco,
          cuentaCorriente: proveedor.cuentaCorriente,
          estado: '1',
        },
        ...proveedores,
      ]);
      return of(undefined);
    }

    const payload = {
      ruc: proveedor.ruc?.trim() || null,
      razonSocial: proveedor.razonSocial.trim(),
      direccion: proveedor.direccion?.trim() || null,
      telefono: proveedor.telefono?.trim() || null,
      correo: proveedor.correo?.trim() || null,
      contacto: proveedor.contacto?.trim() || null,
      banco: proveedor.banco?.trim() || null,
      cuentaCorriente: proveedor.cuentaCorriente?.trim() || null,
    };

    return this.http.post<unknown>(this.endpoint, payload).pipe(map(() => undefined));
  }

  actualizar(original: Proveedor, proveedor: NuevoProveedor): Observable<void> {
    if (!this.puedeModificar()) {
      return throwError(
        () => new Error('La edición requiere que el backend habilite la operación.'),
      );
    }

    if (this.authService.isDemoMode()) {
      this.demoProveedores.update((proveedores) =>
        proveedores.map((item) =>
          this.clave(item) === this.clave(original)
            ? {
                id: item.id,
                ruc: proveedor.ruc,
                razonSocial: proveedor.razonSocial,
                direccion: proveedor.direccion,
                telefono: proveedor.telefono,
                correo: proveedor.correo,
                contacto: proveedor.contacto,
                banco: proveedor.banco,
                cuentaCorriente: proveedor.cuentaCorriente,
                estado: item.estado ?? '1',
              }
            : item,
        ),
      );
      return of(undefined);
    }

    const id = original.id ?? original.ruc;
    const payload = {
      ruc: proveedor.ruc?.trim() || null,
      razonSocial: proveedor.razonSocial.trim(),
      direccion: proveedor.direccion?.trim() || null,
      telefono: proveedor.telefono?.trim() || null,
      correo: proveedor.correo?.trim() || null,
      contacto: proveedor.contacto?.trim() || null,
      banco: proveedor.banco?.trim() || null,
      cuentaCorriente: proveedor.cuentaCorriente?.trim() || null,
    };

    return this.http.put<unknown>(`${this.endpoint}/${id}`, payload).pipe(map(() => undefined));
  }

  eliminar(proveedor: Proveedor): Observable<void> {
    if (!this.puedeEliminar() && !this.puedeModificar()) {
      return throwError(
        () => new Error('La eliminación requiere que el backend habilite la operación.'),
      );
    }

    if (this.authService.isDemoMode()) {
      this.demoProveedores.update((proveedores) =>
        proveedores.filter((item) => this.clave(item) !== this.clave(proveedor)),
      );
      return of(undefined);
    }

    const id = proveedor.id ?? proveedor.ruc;
    return this.http.delete<unknown>(`${this.endpoint}/${id}`).pipe(map(() => undefined));
  }

  private clave(proveedor: Proveedor): string {
    return String(proveedor.id ?? proveedor.ruc);
  }

  private normalizarPagina(
    response: unknown,
    requestedPage = 0,
    requestedSize = 10,
  ): PageResponse<Proveedor> {
    const data = isApiResponse(response) ? getApiResponseData(response) : response;

    if (!isRecord(data)) {
      throw new Error('La respuesta del servidor no contiene una página válida de proveedores.');
    }

    if (isPageResponse<unknown>(data)) {
      const content: Proveedor[] = data.content.map((item) => this.mapToProveedor(item));
      const page =
        typeof data.page === 'number'
          ? data.page
          : typeof data.number === 'number'
            ? data.number
            : requestedPage;
      const size = typeof data.size === 'number' ? data.size : requestedSize;
      const totalElements =
        typeof data.totalElements === 'number' ? data.totalElements : content.length;
      const totalPages =
        typeof data.totalPages === 'number'
          ? data.totalPages
          : Math.ceil(totalElements / (size || 10));

      return {
        content,
        page,
        number: page,
        size,
        totalElements,
        totalPages,
        first: data.first ?? page === 0,
        last: data.last ?? page + 1 >= totalPages,
        numberOfElements: data.numberOfElements ?? content.length,
        empty: data.empty ?? content.length === 0,
      };
    }

    throw new Error('La respuesta del servidor no contiene una página válida de proveedores.');
  }

  private mapToProveedor(item: unknown): Proveedor {
    if (!isRecord(item)) {
      return { id: '', ruc: '', razonSocial: '' };
    }
    return {
      id: (item['id'] as string | number) ?? undefined,
      ruc: item['ruc'] != null ? String(item['ruc']) : null,
      razonSocial: (item['razonSocial'] as string) ?? null,
      direccion: (item['direccion'] as string) ?? null,
      telefono: (item['telefono'] as string) ?? null,
      correo: (item['correo'] as string) ?? null,
      contacto: (item['contacto'] as string) ?? null,
      banco: (item['banco'] as string) ?? null,
      cuentaCorriente: (item['cuentaCorriente'] as string) ?? null,
      estado: item['estado'] != null ? String(item['estado']) : '1',
    };
  }
}
