require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Project = require('../models/Project');
const Load = require('../models/Load');
const connectDB = require('../config/database');

// Sample data
const users = [
    {
        username: 'admin',
        password: 'admin123',
        role: 'Admin',
        status: 'Active'
    },
    {
        username: 'viewer',
        password: 'viewer123',
        role: 'Viewer',
        status: 'Active'
    }
];

const projects =[
    {
        "code":"PJT-47600",
        "name":"1900 West",
        "status":"Active",
        "address":"Serina Homes",
        "description":"Delivery to: 3350 - 19 Street SW, Calgary "
    },
    {
        "code":"PJT-47602",
        "name":"45HP Caps DQ#34388",
        "status":"Active",
        "address":"Chinook Glass & Screen Ltd.",
        "description":"Delivery to: 321-16th Avenue NW, T2M 0H9"
    },
    {
        "code":"PJT-47603",
        "name":"8400 Panic",
        "status":"Active",
        "address":"CP Distributors Ltd.",
        "description":"Delivery to: 120-4550 25th Street Calgary, Alberta T2B 3P1"
    },
    {
        "code":"PJT-47604",
        "name":"Accurate",
        "status":"Active",
        "address":"Economy Glass",
        "description":"Delivery to: 101-17th Avenue SW Calgary T2S 0A1"
    },
    {
        "code":"PJT-47605",
        "name":"Alberta Health ",
        "status":"Active",
        "address":"Chinook Glass",
        "description":"Delivery to: 321-16th Avenue NW, T2M 0H9"
    },
    {
        "code":"PJT-47606",
        "name":"All Kind Glass DQ#34420",
        "status":"Active",
        "address":"Miscellaneous -Supply Only ",
        "description":"Delivery to: Calgary Alberta"
    },
    {
        "code":"PJT-47607",
        "name":"Aluminum Panel",
        "status":"Active",
        "address":"Diamond Glass",
        "description":"Delivery to: PO Box 1645, 329 Old Airport Road  Yellowknife, NWT X1A 2P2"
    },
    {
        "code":"PJT-47608",
        "name":"AMUFL",
        "status":"Active",
        "address":"Cana Construction",
        "description":"Delivery to: 805 Main St S #2, Airdrie, AB T4B 3M1"
    },
    {
        "code":"PJT-47610",
        "name":"Blood Tribe Recovery Community",
        "status":"Active",
        "address":"Synergy Builds",
        "description":"Delivery to: 1 Ave W and 1 Ave, Cardston, AB "
    },
    {
        "code":"PJT-47611",
        "name":"Burnaby Hospital",
        "status":"Active",
        "address":"Thermal System",
        "description":"Delivery to: 3395 KINCAID STREET, BURNABY, BC V5G 2X6"
    },
    {
        "code":"PJT-47612",
        "name":"Calgary Go Auto & RV",
        "status":"Active",
        "address":"Synergy Builds",
        "description":"Delivery to: 2505 Country Hills Boulevard NE"
    },
    {
        "code":"PJT-47613",
        "name":"Capital City",
        "status":"Active",
        "address":"Capital City",
        "description":"Delivery to: 10735 184 Street NW Edmonton, Alberta T5S 2T2"
    },
    {
        "code":"PJT-47614",
        "name":"Carpi 45HP DQ#34034 Hepting Glass",
        "status":"Active",
        "address":"Miscellaneous-Supply Only",
        "description":"Delivery to: 1145 F Rose ST,Regina SK "
    },
    {
        "code":"PJT-47615",
        "name":"Castaways DQ#34206",
        "status":"Active",
        "address":"South Hill Windoews & Awning Ltd.",
        "description":"Delivery to: 100,153 Clearmile Avenue Red Deer, Alberta T4E 0A1"
    },
    {
        "code":"PJT-47616",
        "name":"CC4",
        "status":"Active",
        "address":"Lark",
        "description":"Delivery to: 6088 University Boulevard, Vancouver BC"
    },
    {
        "code":"PJT-47617",
        "name":"CCCBL",
        "status":"Active",
        "address":"CANA Construction",
        "description":"Delivery to: 3851 23NE Calgary, AB T2E6T2"
    },
    {
        "code":"PJT-47618",
        "name":"Cellar Room",
        "status":"Active",
        "address":"Holbie's Glass Ltd.",
        "description":"Delivery to: Box 8, Killam Alberta, T0B2L0"
    },
    {
        "code":"PJT-47619",
        "name":"Chinook Feeders",
        "status":"Active",
        "address":"Westco Construction",
        "description":"Delivery to: near the corner of Township Road 172 and Range Road 272 Foothills County, Alberta"
    },
    {
        "code":"PJT-47620",
        "name":"City Centre",
        "status":"Active",
        "address":"Lark",
        "description":"Delivery to: 9686 137 Street, Surrey, BC"
    },
    {
        "code":"PJT-47621",
        "name":"Imperial Group",
        "status":"Active",
        "address":"Wii Projects ",
        "description":"Delivery to: 3808 - 7 Street SE, Calgary    "
    },
    {
        "code":"PJT-47622",
        "name":"Currie Barracks Bldg. 2",
        "status":"Active",
        "address":"Rohit Group",
        "description":"Delivery to: 330 Dieppe Drive SW, Calgary, AB"
    },
    {
        "code":"PJT-47623",
        "name":"Dairy Queen Memorial Dr.NE DQ#34139",
        "status":"Active",
        "address":"Chinook Glass & Screen Ltd.",
        "description":"Delivery to: 321-16 th Avenue NW Calgary Alberta T2M 0H9"
    },
    {
        "code":"PJT-47624",
        "name":"Element Hotel ",
        "status":"Active",
        "address":"Archicon",
        "description":"Delivery to: 833 4th Ave. SW, Calgary, AB "
    },
    {
        "code":"PJT-47625",
        "name":"Element Hotel \u2013 Skip Hoist Replacement",
        "status":"Active",
        "address":"Archicon",
        "description":"Delivery to: 833 4th Ave. SW, Calgary AB"
    },
    {
        "code":"PJT-47626",
        "name":"EV606 Podium ",
        "status":"Active",
        "address":"Q Construction",
        "description":"Delivery to: 606 Confluence Way SE Calgary, AB"
    },
    {
        "code":"PJT-47627",
        "name":"Feyter STS Forma Steel",
        "status":"Active",
        "address":"Westco Construction",
        "description":"Delivery to: 20 Barracks Trail, Fort Macleod, AB"
    },
    {
        "code":"PJT-47628",
        "name":"Glasier Redge",
        "status":"Active",
        "address":"Ledcor",
        "description":"Delivery to: 146 Edith Drive NW, Calgary "
    },
    {
        "code":"PJT-47629",
        "name":"Glenmore Temple ",
        "status":"Active",
        "address":"Carlson",
        "description":"Delivery to: 68 Ave DW #921 Calgary T2V 0N7"
    },
    {
        "code":"PJT-47630",
        "name":"Greystone Coop",
        "status":"Active",
        "address":"CANA Construction",
        "description":"Delivery to: 264 Park Street Cochrane, Alberta"
    },
    {
        "code":"PJT-47631",
        "name":"Griffin Glass",
        "status":"Active",
        "address":"Griffin Glass",
        "description":"Delivery to: 1307 Hasting Crescent SE, T2G 4C8"
    },
    {
        "code":"PJT-47633",
        "name":"Independent Glass Contracting",
        "status":"Active",
        "address":"Independent Glass Contracting",
        "description":"Delivery to: Calgary, AB"
    },
    {
        "code":"PJT-47634",
        "name":"Insight Glazing",
        "status":"Active",
        "address":"Insight Glazing",
        "description":"Delivery to: 109 Cheecham Crt Anzac, AB T0P1J0, Canada"
    },
    {
        "code":"PJT-47635",
        "name":"Insta-Source DQ#34033",
        "status":"Active",
        "address":"Economy Glass",
        "description":"Delivery to: 101-17th Avenue SW Calgary T2S 0A1"
    },
    {
        "code":"PJT-47636",
        "name":"JIT North East",
        "status":"Active",
        "address":"JIT",
        "description":"Delivery to: 701-30th Street NE, Calgary Alberta T2A 5L7"
    },
    {
        "code":"PJT-47637",
        "name":"JIT South East",
        "status":"Active",
        "address":"JIT",
        "description":"Delivery to: 7815 46St. SE"
    },
    {
        "code":"PJT-47638",
        "name":"JS Aircraft Hanger",
        "status":"Active",
        "address":"Jim Sibthorpe",
        "description":"Delivery to: #1 220 Avro Lane"
    },
    {
        "code":"PJT-47639",
        "name":"Kikinow Door Adapror Cap",
        "status":"Active",
        "address":"Central Alberta Windowa",
        "description":"Delivery to: 114-25 Belich Crescent Red Deer Counrty,Alberta T4S 2K5"
    },
    {
        "code":"PJT-47640",
        "name":"King's Thunderbird",
        "status":"Active",
        "address":"Chandos",
        "description":"Delivery to: 10729-101 Street NW, Edmonton"
    },
    {
        "code":"PJT-47641",
        "name":"Kodiak Astragal",
        "status":"Active",
        "address":"Central Alberta Windowa",
        "description":"Delivery to: 114-25 Belich Crescent Red Deer Counrty,Alberta T4S 2K5"
    },
    {
        "code":"PJT-47642",
        "name":"Kodiak DQ#33998",
        "status":"Active",
        "address":"Central Alberta Windowa",
        "description":"Delivery to: 114-25 Belich Crescent Red Deer Counrty,Alberta T4S 2K5"
    },
    {
        "code":"PJT-47643",
        "name":"Kodiak DQ34395",
        "status":"Active",
        "address":"Central Alberta Windowa",
        "description":"Delivery to: 114-25 Belich Crescent Red Deer Counrty,Alberta T4S 2K5"
    },
    {
        "code":"PJT-47644",
        "name":"Lemon Garden Aluminium DQ#34009 & 24165",
        "status":"Active",
        "address":"Bennett Glass",
        "description":"Delivery to: Unit 14, 2305-52nd Avenue SE"
    },
    {
        "code":"PJT-47645",
        "name":"Marine Landing",
        "status":"Active",
        "address":"Ventana",
        "description":"Delivery to: 8188 & 8250 Manitoba Street, Vancouver"
    },
    {
        "code":"PJT-47646",
        "name":"Marine Landing\nBurnaby\nCC4",
        "status":"Active",
        "address":"Ventana\nThermal Systems\nLark",
        "description":"Delivery to: 6088 University Boulevard, Vancouver BC"
    },
    {
        "code":"PJT-47647",
        "name":"Mary Brow's-Tim Hortons DQ#32296",
        "status":"Active",
        "address":"Central Alberta Windowa",
        "description":"Delivery to: 114-25 Belich Crescent Red Deer Counrty,Alberta T4S 2K5"
    },
    {
        "code":"PJT-47648",
        "name":"Mayfair Place DQ#34186",
        "status":"Active",
        "address":"All Kind Door Services Ltd.",
        "description":"Delivery to: 1455-34th Avenue SE Calgary, Alberta T2G 4Y1"
    },
    {
        "code":"PJT-47649",
        "name":"Meadow Vista Bldg. 3000",
        "status":"Active",
        "address":"Brad Remington",
        "description":"Delivery to: Calgary, AB T2X 4K9"
    },
    {
        "code":"PJT-47650",
        "name":"Mercury Block II",
        "status":"Active",
        "address":"Cana Construction",
        "description":"Delivery to: 10146-123 STREET NW, EDMONTON, ALBERTA"
    },
    {
        "code":"PJT-47651",
        "name":"Miscellaneous - Supply Only",
        "status":"Active",
        "address":"DNO Glass",
        "description":"Delivery to: Calgary Alberta"
    },
    {
        "code":"PJT-47652",
        "name":"Miscellaneous Supply Only",
        "status":"Active",
        "address":"Independent Glass Contracting",
        "description":"Delivery to: Calgary, alberta"
    },
    {
        "code":"PJT-47653",
        "name":"Myne BLDG 1000",
        "status":"Active",
        "address":"Truman Homes",
        "description":"Delivery to: #1000, 63 CORNER GLEN CR NE LOT 1 BLOCK 30 PLAN 231 1614"
    },
    {
        "code":"PJT-47654",
        "name":"NAPEG",
        "status":"Active",
        "address":"Diamond Glass",
        "description":"Delivery to: PO Box 1645, 329 Old Airport Road"
    },
    {
        "code":"PJT-47655",
        "name":"New Shop Windows",
        "status":"Active",
        "address":"Chinook Glass",
        "description":"Delivery to: 321-16th Avenue NW, T2M 0H9"
    },
    {
        "code":"PJT-47656",
        "name":"Noble Ground DQ#33871",
        "status":"Active",
        "address":"Chinook Glass & Screen Ltd.",
        "description":"Delivery to: 321-16th Avenue NW Calgary, Alberta T2M 0H9"
    },
    {
        "code":"PJT-47657",
        "name":"Noble Grounds Down Town",
        "status":"Active",
        "address":"Chinook Glass",
        "description":"Delivery to: 321-16th Avenue NW, T2M 0H9"
    },
    {
        "code":"PJT-47658",
        "name":"Pacific Reach",
        "status":"Active",
        "address":"Q Construction",
        "description":"Delivery to: 521 3 Ave SW, Calgary, AB T2P 3T3"
    },
    {
        "code":"PJT-47659",
        "name":"Paul Davis- Sims Olds",
        "status":"Active",
        "address":"South Hill Windows",
        "description":"Delivery to: 100, 153 Clearmile Avenue Red Deer County, Alberta T4E0A1"
    },
    {
        "code":"PJT-47660",
        "name":"Peak Landmark LTD",
        "status":"Active",
        "address":"Peak Landmark LTD",
        "description":"Delivery to: 4436-90TH AVE SE, CALGARY, AB T2C  2S7"
    },
    {
        "code":"PJT-47661",
        "name":"Place 800",
        "status":"Active",
        "address":"Desa Install",
        "description":"Delivery to: 800 6 Ave SW, Calgary, AB T2P 3G3"
    },
    {
        "code":"PJT-47662",
        "name":"Podium Bldg. F",
        "status":"Active",
        "address":"Deveraux",
        "description":"Delivery to: 8620 CANADA OLYMPIC DRIVE SW"
    },
    {
        "code":"PJT-47663",
        "name":"Port o Call Phase 1",
        "status":"Active",
        "address":"South Hill Windows",
        "description":"Delivery to: 100, 153 Clearmile Avenue Red Deer County, Alberta T4E0A1"
    },
    {
        "code":"PJT-47664",
        "name":"Port o Call Phase 1 & 2",
        "status":"Active",
        "address":"South Hill Windows",
        "description":"Delivery to: 100, 153 Clearmile Avenue Red Deer County, Alberta T4E0A1"
    },
    {
        "code":"PJT-47665",
        "name":"Precision Builders",
        "status":"Active",
        "address":"Chinook Glass",
        "description":"Delivery to: 321-16th Avenue NW, T2M 0H9"
    },
    {
        "code":"PJT-47666",
        "name":"Rimac Fabricators Ltd",
        "status":"Active",
        "address":"Rimac Fabricators Ltd",
        "description":"Delivery to: 265 Applewood Crescent, Concord Ontario, L4K4E7"
    },
    {
        "code":"PJT-47667",
        "name":"Royal BC Museum",
        "status":"Active",
        "address":"Maple Reinders",
        "description":"Delivery to: 3608 Ryder Hesjedal Way Coldwood, BC V9C0T2"
    },
    {
        "code":"PJT-47668",
        "name":"Sage Hill Estates",
        "status":"Active",
        "address":"Spray Group",
        "description":"Delivery to: 30 Sage Hill Row NW, Calgary   "
    },
    {
        "code":"PJT-47669",
        "name":"Save on Food",
        "status":"Active",
        "address":"Laurin Group",
        "description":"Delivery to: NA'A Drive SW,Calgary AB T2E 7G9"
    },
    {
        "code":"PJT-47670",
        "name":"Seton Market",
        "status":"Active",
        "address":"Ledcor",
        "description":"Delivery to: 3815 Front St SE #125 Calgary."
    },
    {
        "code":"PJT-47671",
        "name":"Slider Door",
        "status":"Active",
        "address":"Griffin Glass",
        "description":"Delivery to: 1307 Hasting Crescent SE, T2G 4C8"
    },
    {
        "code":"PJT-47672",
        "name":"South Hill (47659,47725,47724,47726,47729)",
        "status":"Active",
        "address":"South Hill Windows",
        "description":"Delivery to: 100, 153 Clearmile Avenue Red Deer County, Alberta T4E0A1"
    },
    {
        "code":"PJT-47673",
        "name":"St. Mary Church",
        "status":"Active",
        "address":"South Hill Windows",
        "description":"Delivery to: 100, 153 Clearmile Avenue Red Deer County, Alberta T4E0A1"
    },
    {
        "code":"PJT-47674",
        "name":"St.Mary's Church DG#33860",
        "status":"Active",
        "address":"South Hill Windoews & Awning Ltd.",
        "description":"Delivery to: 100, 153 Clearmile Avenue Red Deer County, Alberta T4E0A1"
    },
    {
        "code":"PJT-47675",
        "name":"State & Main DQ#34043",
        "status":"Active",
        "address":"Central Alberta Windowa",
        "description":"Delivery to: 114-25 Belich Crescent Red Deer Counrty,Alberta T4S 2K5"
    },
    {
        "code":"PJT-47676",
        "name":"Stock 12\" Pull Handle ",
        "status":"Active",
        "address":"All Kind Door Services Ltd.",
        "description":"Delivery to: 1455-34th Avenue SE Calgary, Alberta T2G 4Y1"
    },
    {
        "code":"PJT-47677",
        "name":"Stock DQ#34323",
        "status":"Active",
        "address":"Abtek Door Services Ltd.",
        "description":"Delivery to: 860 Rutherford Road Maple, Ontario L6A 1S2"
    },
    {
        "code":"PJT-47678",
        "name":"Stock Handles",
        "status":"Active",
        "address":"South Hill Windows & Awning Ltd.",
        "description":"Delivery to: 100,153 Clearmile Avenue Red Deer, Alberta T4E 0A1"
    },
    {
        "code":"PJT-47679",
        "name":"Stock Handles & 3 3\/4 Cover Cap",
        "status":"Active",
        "address":"South Hill Windoews & Awning Ltd.",
        "description":"Delivery to: 100,153 Clearmile Avenue Red Deer, Alberta T4E 0A1"
    },
    {
        "code":"PJT-47680",
        "name":"Stock Hardware",
        "status":"Active",
        "address":"Griffin Glass",
        "description":"Delivery to: 1307 Hasting Crescent SE, T2G 4C8"
    },
    {
        "code":"PJT-47681",
        "name":"Stock Hardware DQ#34319",
        "status":"Active",
        "address":"CP Distributors Ltd.",
        "description":"Delivery to: 120-4550 25th Street Calgary Alberta"
    },
    {
        "code":"PJT-47682",
        "name":"Stock Hardware DQ#34393",
        "status":"Active",
        "address":"Independent Glass Contracting",
        "description":"Delivery to: Unit#2-701 30th Street NE Calgary AB T2A 6A3"
    },
    {
        "code":"PJT-47683",
        "name":"Stock Hardware DQ#34417",
        "status":"Active",
        "address":"Capital Glass Brooks 2010 Ltd.",
        "description":"Delivery to: Box 1150, 824-2nd Street West Brooks, Alberta T1R 1B9"
    },
    {
        "code":"PJT-47684",
        "name":"Stock Material DQ#34325",
        "status":"Active",
        "address":"Bennett Glass",
        "description":"Delivery to: Unit 14, 2305-52nd Avenue SE"
    },
    {
        "code":"PJT-47685",
        "name":"Stock Material DQ#34459",
        "status":"Active",
        "address":"King's Glass Ltd.",
        "description":"Delivery to: 6320 Centre Street SE"
    },
    {
        "code":"PJT-47686",
        "name":"Stock Steel Angle DQ#34427",
        "status":"Active",
        "address":"South Hill Windoews & Awning Ltd.",
        "description":"Delivery to: 100, 153 Clearmile Avenue Red Deer County, Alberta T4E0A1"
    },
    {
        "code":"PJT-47687",
        "name":"Teck Sparwood",
        "status":"Active",
        "address":"Ellis Don",
        "description":"Delivery to: 2202 Middletown Place Sparwood BC"
    },
    {
        "code":"PJT-47688",
        "name":"Terrigno",
        "status":"Active",
        "address":"South Hill Windows",
        "description":"Delivery to: 321-16th Avenue NW, T2M 0H9"
    },
    {
        "code":"PJT-47689",
        "name":"Thai Thai DQ#34266",
        "status":"Active",
        "address":"King's Glass Ltd.",
        "description":"Delivery to: 6320 Centre Street SE"
    },
    {
        "code":"PJT-47690",
        "name":"The Gateway 3 Sister",
        "status":"Active",
        "address":"Cana Construction",
        "description":"Delivery to: Cascade Drive, Canmore, AB"
    },
    {
        "code":"PJT-47691",
        "name":"The Loft",
        "status":"Active",
        "address":"Maple Reinders",
        "description":"Delivery to: 744-4 Avenue SW Calgary, Alberta"
    },
    {
        "code":"PJT-47692",
        "name":"Tim Horton's 17th Ave DQ#34333",
        "status":"Active",
        "address":"King's Glass Ltd.",
        "description":"Delivery to: 6320 Centre Street SE"
    },
    {
        "code":"PJT-47693",
        "name":"Trail Construction",
        "status":"Active",
        "address":"Chinook Glass",
        "description":"Delivery to: 321-16th Avenue NW, T2M 0H9"
    },
    {
        "code":"PJT-47694",
        "name":"Trinity Hills",
        "status":"Active",
        "address":"Laurin Group",
        "description":"Delivery to: 924 Na'a Drive SW, Calgary, Alberta"
    },
    {
        "code":"PJT-47695",
        "name":"UBC-SBME",
        "status":"Active",
        "address":"Ventana",
        "description":"Delivery to: 6088 University Boulevard , Vancouver , BC "
    },
    {
        "code":"PJT-47696",
        "name":"USAY Youth Center",
        "status":"Active",
        "address":"Synergy Builds",
        "description":"Delivery to: 1715 - 36 Street SE, Calgary"
    },
    {
        "code":"PJT-47697",
        "name":"We Wai Kai",
        "status":"Active",
        "address":"Ketza Pacific",
        "description":"Delivery to: 2025 Eagle Drive, Campbell River, BC V9H 1P9"
    },
    {
        "code":"PJT-47698",
        "name":"Westbrook DQ#34210",
        "status":"Active",
        "address":"GQM Services",
        "description":"Delivery to: 228 Mt.Cornwall Mews SE Calgary, Alberta T2Z 2J8"
    },
    {
        "code":"PJT-47699",
        "name":"WSCC",
        "status":"Active",
        "address":"Diamond Glass",
        "description":"Delivery to: PO Box 1645, 329 Old Airport Road, Yellowknife, NWTX1A2P2"
    }
];

const loads = [
    {
        truckId: 'TRUCK-ABC',
        projectCode: '47290',
        dateEntered: new Date('2023-10-27T10:30:00'),
        status: 'Loaded',
        truckInfo: {
            length: 53,
            width: 8.5,
            weight: 45000
        },
        skids: [
            { id: 'SKID-1', width: 4, length: 4, weight: 500, description: 'Pallet 1' },
            { id: 'SKID-2', width: 4, length: 4, weight: 600, description: '' },
            { id: 'SKID-3', width: 4, length: 4, weight: 550, description: 'Fragile' }
        ],
        packingList: {
            date: new Date('2023-10-27'),
            workOrder: 'WO-111',
            projectName: 'We Wai Kai',
            projectAddress: 'Site Address A',
            requestedBy: 'Client A',
            carrier: 'Fast Freight',
            consignee: 'Job Site A',
            consigneeAddress: 'Delivery Addr A',
            siteContact: 'Foreman Bill',
            sitePhone: '555-111-2222',
            deliveryDate: new Date('2023-10-28'),
            packagedBy: 'PK',
            checkedBy: 'LD',
            receivedBy: 'John D.',
            signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
        },
        skidCount: 3,
        totalWeight: 1650
    },
    {
        truckId: 'PLATE-123',
        projectCode: '47402',
        dateEntered: new Date('2023-10-27T09:15:00'),
        status: 'Planned',
        truckInfo: {
            length: 48,
            width: 8,
            weight: 40000
        },
        skids: [
            { id: 'SKID-4', width: 8, length: 6, weight: 1200, description: 'Heavy materials' }
        ],
        packingList: {
            date: new Date('2023-10-27'),
            workOrder: 'WO-112',
            projectName: '104Ave',
            projectAddress: '456 104th Ave, Surrey, BC',
            requestedBy: 'Client B',
            carrier: 'ABC Trucking'
        },
        skidCount: 1,
        totalWeight: 1200
    },
    {
        truckId: 'TRUCK-XYZ',
        projectCode: '45863',
        dateEntered: new Date('2023-10-26T14:00:00'),
        status: 'Delivered',
        truckInfo: {
            length: 53,
            width: 8.5,
            weight: 45000
        },
        skids: [
            { id: 'SKID-5', width: 4, length: 4, weight: 800, description: 'Glass panels' },
            { id: 'SKID-6', width: 4, length: 4, weight: 750, description: 'Frames' },
            { id: 'SKID-7', width: 4, length: 4, weight: 600, description: 'Hardware' }
        ],
        packingList: {
            date: new Date('2023-10-26'),
            workOrder: 'WO-113',
            projectName: 'DeVille Tower',
            projectAddress: '789 West St, Calgary, AB',
            requestedBy: 'Client C',
            carrier: 'FastFreight',
            consignee: 'DeVille Construction',
            consigneeAddress: '789 West St, Calgary, AB',
            siteContact: 'Site Manager',
            sitePhone: '555-333-4444',
            deliveryDate: new Date('2023-10-27'),
            packagedBy: 'JD',
            checkedBy: 'TS',
            receivedBy: 'Bob Smith',
            signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
        },
        skidCount: 3,
        totalWeight: 2150
    }
];

// Function to delete existing data and seed new data
const seedData = async () => {
    try {
        // Connect to database
        await connectDB();

        // Delete existing data
        await User.deleteMany({});
        await Project.deleteMany({});
        await Load.deleteMany({});

        console.log('Existing data deleted');

        // Create admin user first
        const adminUser = await User.create(users[0]);
        console.log('Admin user created');

        // Create viewer user
        await User.create(users[1]);
        console.log('Viewer user created');

        // Create projects
        for (let project of projects) {
            project.createdBy = adminUser._id;
            await Project.create(project);
        }
        console.log('Projects created');

        // Create loads
        for (let load of loads) {
            load.createdBy = adminUser._id;
            await Load.create(load);
        }
        console.log('Loads created');

        console.log('Data seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

// Run the seeder if called directly
if (require.main === module) {
    seedData().then(result => {
        if (result.success) {
            process.exit(0);
        } else {
            process.exit(1);
        }
    });
}

module.exports = { seedData };
 