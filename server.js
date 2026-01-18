const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static(__dirname));

// --- Game Constants & Data ---
const WORDS = [
    // --- ANIMALS ---
    "Aardvark", "Albatross", "Alligator", "Alpaca", "Ant", "Anteater", "Antelope", "Ape", "Armadillo",
    "Baboon", "Badger", "Eagle", "Bat", "Bear", "Beaver", "Bee", "Beetle", "Bird", "Bison",
    "Boar", "Buffalo", "Butterfly", "Camel", "Capybara", "Cat", "Caterpillar", "Cheetah", "Chicken",
    "Chimpanzee", "Chinchilla", "Chipmunk", "Cobra", "Cockroach", "Cod", "Cougar", "Cow", "Coyote",
    "Crab", "Crane", "Cricket", "Crocodile", "Crow", "Deer", "Dinosaur", "Dog", "Dolphin", "Donkey",
    "Dove", "Dragonfly", "Duck", "Eagle", "Eel", "Elephant", "Elk", "Emu", "Falcon", "Ferret",
    "Finch", "Fish", "Flamingo", "Flea", "Fly", "Fox", "Frog", "Gazelle", "Gecko", "Gerbil",
    "Giraffe", "Gnat", "Goat", "Goldfish", "Goose", "Gorilla", "Grasshopper", "Guinea Pig", "Hamster",
    "Hare", "Hawk", "Hedgehog", "Heron", "Hippo", "Hornet", "Horse", "Hummingbird", "Hyena", "Iguana",
    "Impala", "Insect", "Jackal", "Jaguar", "Jellyfish", "Kangaroo", "Koala", "Koi", "Komodo Dragon",
    "Ladybug", "Lamb", "Lemur", "Leopard", "Lion", "Lizard", "Llama", "Lobster", "Locust", "Lynx",
    "Macaw", "Magpie", "Mallard", "Mammoth", "Manatee", "Mantis", "Meerkat", "Mink", "Mole",
    "Mongoose", "Monkey", "Moose", "Mosquito", "Moth", "Mouse", "Mule", "Narwhal", "Newt",
    "Nightingale", "Octopus", "Okapi", "Opossum", "Oryx", "Ostrich", "Otter", "Owl", "Ox",
    "Oyster", "Panther", "Parrot", "Partridge", "Peacock", "Pelican", "Penguin", "Pheasant", "Pig",
    "Pigeon", "Piranha", "Platypus", "Polar Bear", "Porcupine", "Porpoise", "Possum", "Prawn", "Pug",
    "Puma", "Quail", "Rabbit", "Raccoon", "Ram", "Rat", "Rattlesnake", "Raven", "Reindeer", "Rhino",
    "Rooster", "Salamander", "Salmon", "Sand Dollar", "Sardine", "Scorpion", "Seahorse", "Seal",
    "Shark", "Sheep", "Shrew", "Shrimp", "Skunk", "Sloth", "Slug", "Snail", "Snake", "Spider",
    "Squid", "Squirrel", "Starfish", "Stingray", "Stork", "Swan", "Tapir", "Termite", "Tiger",
    "Toad", "Tortoise", "Toucan", "Trout", "Turkey", "Turtle", "Viper", "Vulture", "Wallaby",
    "Walrus", "Wasp", "Weasel", "Whale", "Wolf", "Wolverine", "Wombat", "Woodpecker", "Worm",
    "Yak", "Zebra",

    // --- FOOD & DRINK ---
    "Acorn", "Almond", "Apple", "Apricot", "Asparagus", "Avocado", "Bacon", "Bagel", "Banana",
    "Barbecue", "Basil", "Bean", "Beef", "Beer", "Beet", "Berry", "Biscuit", "Blackberry",
    "Blueberry", "Bread", "Broccoli", "Brownie", "Burrito", "Butter", "Cabbage", "Cake", "Candy",
    "Cantaloupe", "Caramel", "Carrot", "Cashew", "Cauliflower", "Celery", "Cereal", "Cheese",
    "Cheeseburger", "Cherry", "Chestnut", "Chili", "Chips", "Chocolate", "Cinnamon", "Clam",
    "Coconut", "Coffee", "Cola", "Cookie", "Corn", "Cotton Candy", "Crab", "Cracker", "Cranberry",
    "Croissant", "Cucumber", "Cupcake", "Curry", "Date", "Dessert", "Dinner", "Donut", "Dragonfruit",
    "Drink", "Dumpling", "Egg", "Eggplant", "Fig", "Fish", "Flour", "Food", "Fork", "Fries",
    "Fruit", "Garlic", "Ginger", "Grape", "Grapefruit", "Gravy", "Guacamole", "Guava", "Ham",
    "Hamburger", "Hazelnut", "Honey", "Hot Dog", "Hummus", "Ice Cream", "Icing", "Jalapeno", "Jam",
    "Jelly", "Juice", "Kale", "Ketchup", "Kiwi", "Lasagna", "Lemon", "Lemonade", "Lettuce",
    "Lime", "Lobster", "Lolipop", "Lunch", "Macaroni", "Mango", "Marshmallow", "Mayonnaise",
    "Meat", "Meatball", "Melon", "Milk", "Milkshake", "Mint", "Muffin", "Mushroom", "Mustard",
    "Nachos", "Noodle", "Nut", "Oatmeal", "Olive", "Omelet", "Onion", "Orange", "Oreo",
    "Pancake", "Papaya", "Pasta", "Pastry", "Peach", "Peanut", "Pear", "Peas", "Pecan",
    "Pepper", "Pepperoni", "Pickle", "Pie", "Pineapple", "Pistachio", "Pizza", "Plum", "Popcorn",
    "Popsicle", "Pork", "Potato", "Pretzel", "Pudding", "Pumpkin", "Radish", "Raisin", "Raspberry",
    "Ravioli", "Rice", "Roll", "Salad", "Salami", "Salmon", "Salt", "Sandwich", "Sausage",
    "Seafood", "Sesame", "Shake", "Shrimp", "Soda", "Soup", "Soy", "Spaghetti", "Spice",
    "Spinach", "Spoon", "Squash", "Steak", "Stew", "Strawberry", "Sugar", "Sushi", "Syrup",
    "Taco", "Tangerine", "Tea", "Toast", "Tofu", "Tomato", "Tortilla", "Tuna", "Turkey",
    "Turnip", "Vanilla", "Vegetable", "Vinegar", "Waffle", "Walnut", "Water", "Watermelon", "Wheat",
    "Yam", "Yogurt", "Zucchini",

    // --- OBJECTS & HOUSEHOLD ---
    "Alarm", "Anchor", "Anvil", "Axe", "Backpack", "Bag", "Ball", "Balloon", "Bandage",
    "Banner", "Basket", "Bathtub", "Battery", "Bed", "Bell", "Belt", "Bench", "Bib",
    "Binoculars", "Birdcage", "Blanket", "Blender", "Board", "Boat", "Bomb", "Book", "Bookmark",
    "Boombox", "Bottle", "Bowl", "Box", "Bracelet", "Brick", "Bridge", "Broom", "Brush",
    "Bucket", "Bulb", "Button", "Cabinet", "Calculator", "Calendar", "Camera", "Candle", "Canoe",
    "Canvas", "Cap", "Card", "Carpet", "Cart", "Castle", "Catapult", "Chair", "Chalk",
    "Chandelier", "Charger", "Chest", "Chimney", "Clock", "Cloth", "Coat", "Coffin", "Coin",
    "Comb", "Compass", "Computer", "Controller", "Cooler", "Cork", "Couch", "Crayon", "Cream",
    "Credit Card", "Crib", "Crown", "Crystal", "Cup", "Curtain", "Cushion", "Desk", "Diamond",
    "Dice", "Dictionary", "Dish", "Doll", "Door", "Doormat", "Drill", "Drum", "Duck",
    "Dustpan", "Duvet", "Dynamite", "Earrings", "Easel", "Engine", "Envelope", "Eraser", "Fan",
    "Faucet", "Feather", "Fence", "File", "Fire", "Fireplace", "Flag", "Flashlight", "Flask",
    "Flowerpot", "Flute", "Fork", "Fridge", "Furnace", "Furniture", "Fuse", "Garbage", "Garden",
    "Gate", "Gear", "Gem", "Gift", "Glass", "Glasses", "Glove", "Glue", "Goggle",
    "Gold", "Gong", "Guitar", "Gun", "Hammer", "Hammock", "Handcuffs", "Hanger", "Harp",
    "Hat", "Headphones", "Heater", "Helmet", "Hose", "Hourglass", "House", "Hut", "Igloo",
    "Ink", "iPad", "iPhone", "iPod", "Iron", "Ivory", "Jacket", "Jar", "Jeans",
    "Jewel", "Jigsaw", "Journal", "Jug", "Juice", "Key", "Keyboard", "Kite", "Knife",
    "Knot", "Ladder", "Lamp", "Lantern", "Laptop", "Lasso", "Laundry", "Lawnmower", "Leaf",
    "Leather", "Lens", "Letter", "Light", "Lighter", "Lighthouse", "Lipstick", "Lock", "Locker",
    "Log", "Lotion", "Luggage", "Machine", "Magazine", "Magnet", "Mailbox", "Map", "Marble",
    "Mask", "Match", "Mattress", "Medal", "Medicine", "Microwave", "Mirror", "Missile", "Mixer",
    "Money", "Monitor", "Mop", "Motor", "Mousepad", "Mug", "Nail", "Napkin", "Necklace",
    "Needle", "Net", "Newspaper", "Notebook", "Nozzle", "Nutcracker", "Oar", "Oven", "Package",
    "Paddle", "Paint", "Painting", "Pan", "Pants", "Paper", "Paperclip", "Parachute", "Parcel",
    "Passport", "Pebble", "Pen", "Pencil", "Pendulum", "Perfume", "Phone", "Photo", "Piano",
    "Pillow", "Pipe", "Pistol", "Pitchfork", "Plane", "Plate", "Pliers", "Plug", "Pocket",
    "Podium", "Pole", "Postcard", "Poster", "Pot", "Potion", "Powder", "Present", "Printer",
    "Prism", "Projector", "Propeller", "Pump", "Puppet", "Purse", "Puzzle", "Pyramid", "Quilt",
    "Radar", "Radio", "Raft", "Rail", "Rake", "Ramp", "Razor", "Receipt", "Record",
    "Refrigerator", "Remote", "Ring", "Robot", "Rocket", "Rocking Chair", "Roller", "Roof", "Rope",
    "Rug", "Ruler", "Sack", "Saddle", "Safe", "Sail", "Sandals", "Sandpaper", "Satellite",
    "Saucer", "Saw", "Saxophone", "Scale", "Scarf", "Scissors", "Scooter", "Screen", "Screw",
    "Screwdriver", "Sculpture", "Seat", "Shampoo", "Sheet", "Shelf", "Shell", "Shield", "Ship",
    "Shirt", "Shoe", "Shovel", "Shower", "Shutter", "Sieve", "Sign", "Silk", "Sink",
    "Skate", "Skateboard", "Ski", "Skirt", "Sled", "Slippers", "Soap", "Sock", "Sofa",
    "Solar Panel", "Spade", "Speaker", "Spectacles", "Sponge", "Spool", "Spoon", "Spray", "Spring",
    "Stamp", "Stapler", "Statue", "Stereo", "Stick", "Sticker", "Stocking", "Stool", "Stopwatch",
    "Stove", "Straw", "Streetlight", "String", "Suitcase", "Sun", "Sunglasses", "Sword", "Syringe",
    "Table", "Tablecloth", "Tablet", "Tag", "Tank", "Tape", "Target", "Taxi", "Teapot",
    "Telescope", "Television", "Tent", "Thermometer", "Thimble", "Thread", "Throne", "Ticket", "Tie",
    "Tile", "Timer", "Tissue", "Toaster", "Toilet", "Tool", "Toothbrush", "Toothpaste", "Torch",
    "Towel", "Toy", "Tractor", "Train", "Trampoline", "Trap", "Trash", "Tray", "Treasure",
    "Tree", "Triangle", "Tricycle", "Tripod", "Trophy", "Truck", "Trumpet", "Trunk", "Tub",
    "Tube", "Tunnel", "Tweezers", "Typewriter", "Tire", "Umbrella", "Uniform", "Urn", "Vacuum",
    "Valise", "Van", "Vase", "Vault", "Vegetable", "Vehicle", "Veil", "Vent", "Vessel",
    "Vest", "Video", "Violin", "Visor", "Wagon", "Wall", "Wallet", "Wand", "Wardrobe",
    "Washer", "Watch", "Water", "Wax", "Weapon", "Web", "Wedge", "Weight", "Well",
    "Wheel", "Wheelchair", "Whip", "Whistle", "Wig", "Windmill", "Window", "Wine", "Wire",
    "Wood", "Wool", "Wrench", "Xylophone", "Yacht", "Yardstick", "Yarn", "Yo-yo", "Zipper",

    // --- NATURE & PLACES ---
    "Airport", "Alley", "Arch", "Arena", "Asteroid", "Atmosphere", "Attic", "Aurora", "Autumn",
    "Avenue", "Backyard", "Bank", "Barn", "Base", "Basement", "Bay", "Beach", "Bedroom",
    "Black Hole", "Blizzard", "Bog", "Boulevard", "Brook", "Building", "Bunker", "Bush", "Cabin",
    "Cafe", "Camp", "Campsite", "Canal", "Canyon", "Capital", "Cave", "Ceiling", "Cellar",
    "Cemetery", "Chapel", "Church", "Cinema", "City", "Cliff", "Climate", "Cloud", "Coast",
    "College", "Comet", "Constellation", "Continent", "Coral", "Corner", "Country", "County", "Court",
    "Crater", "Creek", "Dam", "Dawn", "Day", "Deck", "Dell", "Delta", "Desert",
    "Dirt", "Ditch", "Dock", "Dorm", "Driveway", "Dune", "Dusk", "Dust", "Earth",
    "East", "Eclipse", "Edge", "Estate", "Evening", "Everglades", "Factory", "Fair", "Fall",
    "Farm", "Field", "Fire station", "Floor", "Fog", "Forest", "Fort", "Fountain", "Galaxy",
    "Garage", "Garden", "Gate", "Geyser", "Glacier", "Grass", "Graveyard", "Ground", "Grove",
    "Gym", "Hail", "Hall", "Harbor", "Heaven", "Hedge", "Hell", "Hill", "Horizon",
    "Hospital", "Hotel", "House", "Hurricane", "Ice", "Iceberg", "Igloo", "Inlet", "Inn",
    "Island", "Isle", "Jail", "Jungle", "Jupiter", "Kitchen", "Lab", "Lagoon", "Lake",
    "Land", "Lane", "Lava", "Leaf", "Library", "Light", "Lightning", "Lobby", "Lodge",
    "Loop", "Mall", "Manor", "Mansions", "Map", "Market", "Mars", "Marsh", "Maze",
    "Meadow", "Mercury", "Mesa", "Meteor", "Midnight", "Mine", "Mist", "Moon", "Morning",
    "Moss", "Motel", "Mountain", "Museum", "Nature", "Nebula", "Neptune", "Night", "North",
    "Oasis", "Observatory", "Ocean", "Office", "Orbit", "Orchard", "Palace", "Park", "Path",
    "Peak", "Peninsula", "Petal", "Pier", "Plain", "Planet", "Plant", "Plateau", "Playground",
    "Plaza", "Pond", "Pool", "Port", "Prairie", "Prison", "Pub", "Puddle", "Pyramid",
    "Quarry", "Quarter", "Quay", "Radar", "Rain", "Rainbow", "Rainforest", "Ranch", "Rapids",
    "Reef", "Reservoir", "Resort", "Restaurant", "Ridge", "River", "Road", "Rock", "Roof",
    "Room", "Root", "Rose", "Route", "Ruins", "Sand", "Sandstorm", "Saturn", "Savanna",
    "School", "Sea", "Season", "Seed", "Sewer", "Shack", "Shadow", "Shed", "Shore",
    "Shop", "Shower", "Sidewalk", "Sky", "Skyscraper", "Slope", "Smog", "Smoke", "Snow",
    "Soil", "Solar System", "South", "Space", "Space Station", "Spring", "Square", "Stable", "Stadium",
    "Stage", "Star", "Station", "Steam", "Stone", "Storm", "Street", "Studio", "Subway",
    "Summer", "Sun", "Sunset", "Sunshine", "Supermarket", "Swamp", "Taxi", "Temple", "Tent",
    "Terrain", "Territory", "Theater", "Thunder", "Tide", "Timber", "Toilet", "Tomb", "Tornado",
    "Tower", "Town", "Track", "Trail", "Tree", "Trench", "Tropical", "Tunnel", "Twilight",
    "Typhoon", "Universe", "Uranus", "Valley", "Vegetation", "Venus", "View", "Village", "Vine",
    "Volcano", "Wall", "Warehouse", "Waterfall", "Wave", "Way", "Weather", "Web", "West",
    "Wetland", "Wharf", "Whirlpool", "Wilderness", "Wind", "Winter", "Wood", "Woods", "World",
    "Yard", "Zoo",

    // --- PEOPLE & ROLES ---
    "Actor", "Actress", "Adult", "Agent", "Alien", "Angel", "Archer", "Artist", "Assassin",
    "Astronaut", "Athlete", "Author", "Baby", "Baker", "Bandit", "Banker", "Barber", "Bard",
    "Barman", "Baron", "Beggar", "Bishop", "Blacksmith", "Bodyguard", "Boss", "Boy", "Boxer",
    "Bride", "Brother", "Builder", "Burglar", "Butcher", "Butler", "Captain", "Carpenter", "Cashier",
    "Chef", "Chief", "Child", "Chimney Sweeper", "Clerk", "Client", "Clown", "Coach", "Commander",
    "Composer", "Conductor", "Cook", "Cop", "Cowboy", "Crew", "Criminal", "Cyclist", "Dad",
    "Dancer", "Dealer", "Dentist", "Designer", "Detective", "Devil", "Director", "Diver", "Doctor",
    "Driver", "Duke", "Dwarf", "Editor", "Elf", "Emperor", "Enemy", "Engineer", "Farmer",
    "Father", "Fireman", "Fisherman", "Gangster", "Gardener", "Genie", "Ghost", "Giant", "Girl",
    "Gnome", "Goblin", "God", "Goddess", "Golfer", "Governor", "Grandma", "Grandpa", "Guard",
    "Guest", "Guide", "Gymnast", "Hacker", "Hero", "Hippie", "Hobbit", "Host", "Hunter",
    "Husband", "Idol", "Imp", "Infant", "Inspector", "Instructor", "Intern", "Inventor", "Jailer",
    "Janitor", "Jester", "Jockey", "Judge", "Juggler", "Kid", "King", "Knight", "Lady",
    "Lawyer", "Leader", "Librarian", "Lifeguard", "Lord", "Maid", "Mailman", "Manager", "Man",
    "Mayor", "Mechanic", "Medic", "Merchant", "Mermaid", "Messiah", "Miner", "Minister", "Minotaur",
    "Model", "Mom", "Monk", "Monster", "Mother", "Mummy", "Musician", "Nanny", "Neighbor",
    "Ninja", "Nurse", "Officer", "Ogre", "Operator", "Orc", "Orphan", "Owner", "Painter",
    "Parent", "Passenger", "Peasant", "Pedestrian", "Person", "Phantom", "Photographer", "Pilot", "Pirate",
    "Plumber", "Poet", "Police", "Politician", "Pope", "Porter", "Postman", "President", "Priest",
    "Prince", "Princess", "Principal", "Prisoner", "Professor", "Programmer", "Psychic", "Puppeteer", "Queen",
    "Ranger", "Referee", "Reporter", "Representative", "Researcher", "Robber", "Robot", "Rogue", "Sailor",
    "Saint", "Samurai", "Santa", "Scientist", "Scout", "Secretary", "Security", "Servant", "Shaman",
    "Sheriff", "Singer", "Sister", "Skeleton", "Slave", "Sniper", "Soldier", "Son", "Sorcerer",
    "Spy", "Staff", "Student", "Surfer", "Surgeon", "Swimmer", "Tailor", "Teacher", "Teenager",
    "Thief", "Titan", "Toddler", "Tourist", "Trader", "Trainer", "Troll", "Trucker", "Tutor",
    "Twin", "Uncle", "Umpire", "Undertaker", "User", "Vampire", "Viking", "Villain", "Waiter",
    "Waitress", "Warden", "Warrior", "Watchman", "Werewolf", "Wife", "Witch", "Wizard", "Woman",
    "Worker", "Wraith", "Writer", "Zombie",

    // --- ACTIONS & VERBS ---
    "Acting", "Adding", "Aiming", "Alert", "Arguing", "Asking", "Awake", "Baking", "Balance",
    "Bark", "Bathing", "Begging", "Biting", "Bleeding", "Blind", "Blush", "Boil", "Boxing",
    "Break", "Breath", "Brush", "Build", "Burn", "Buy", "Call", "Camping", "Carry",
    "Catch", "Celebrate", "Chase", "Cheat", "Cheer", "Chew", "Choke", "Chop", "Clap",
    "Clean", "Climb", "Close", "Comb", "Cook", "Cough", "Count", "Crack", "Crash",
    "Crawl", "Cry", "Cut", "Dance", "Dig", "Dive", "Draw", "Dream", "Drink",
    "Drive", "Drop", "Drum", "Eat", "Enter", "Escape", "Exercise", "Exit", "Explode",
    "Fall", "Feed", "Fight", "Fish", "Fix", "Float", "Fly", "Fold", "Follow",
    "Freeze", "Frown", "Gamble", "Give", "Glue", "Grab", "Grow", "Hang", "Hatch",
    "Hear", "Hide", "Hit", "Hold", "Hop", "Hug", "Hunt", "Hurt", "Iron",
    "Itch", "Jog", "Juggle", "Jump", "Kick", "Kiss", "Kneel", "Knock", "Laugh",
    "Launch", "Lead", "Lean", "Leave", "Lick", "Lift", "Listen", "Look", "Lose",
    "Love", "Make", "Marry", "March", "Melt", "Mix", "Mow", "Nod", "Open",
    "Paint", "Panic", "Pass", "Pay", "Peel", "Pet", "Pick", "Plant", "Play",
    "Point", "Poke", "Pour", "Pray", "Pull", "Punch", "Push", "Race", "Rake",
    "Read", "Recycle", "Relax", "Repair", "Rest", "Ride", "Rip", "Roll", "Row",
    "Run", "Sail", "Salute", "Save", "Saw", "Scream", "Scrub", "Search", "See",
    "Sell", "Serve", "Sew", "Shake", "Shave", "Shop", "Shout", "Show", "Sing",
    "Sit", "Skate", "Ski", "Skip", "Slap", "Sleep", "Slide", "Slip", "Smell",
    "Smile", "Smoke", "Sneeze", "Sniff", "Snore", "Snow", "Sob", "Speak", "Spell",
    "Spill", "Spin", "Spit", "Split", "Spray", "Squat", "Squeeze", "Stab", "Stand",
    "Stare", "Steal", "Step", "Stir", "Stop", "Stretch", "Study", "Surfing", "Sweat",
    "Sweep", "Swim", "Swing", "Talk", "Taste", "Teach", "Tear", "Tease", "Text",
    "Think", "Throw", "Tickle", "Tie", "Toast", "Touch", "Tow", "Trace", "Trap",
    "Travel", "Trip", "Juggle", "Type", "Vacuum", "Vote", "Wait", "Wake", "Walk",
    "Wash", "Watch", "Wave", "Wear", "Weep", "Weigh", "Whisper", "Whistle", "Win",
    "Wink", "Wipe", "Wish", "Work", "Wrap", "Write", "Yawn", "Yell", "Yoga"
];

const GAME_SETTINGS = {
    MAX_ROUNDS: 3,
    TIME_CHOOSING: 10,
    TIME_DRAWING: 60,
    TIME_INTERMISSION: 5
};

// --- Room State Management ---
const rooms = {};

function generateRoomId() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function getRandomWords(count = 3) {
    const shuffled = WORDS.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// --- Game Logic Classes ---

// --- Game Logic Classes ---

class GameRoom {
    constructor(id, maxPlayers, hostName, hostId, maxRounds = 5, drawingTime = 60, isPublic = false) {
        this.id = id;
        this.maxPlayers = maxPlayers;
        this.maxRounds = maxRounds;
        this.drawingTime = drawingTime;
        this.isPublic = isPublic;
        this.players = []; // Array of { id, name, score, avatar, guessed }
        this.addPlayer(hostId, hostName);

        // Game State
        this.state = 'LOBBY';
        this.round = 1;
        this.drawerIndex = 0;
        this.currentWord = "";
        this.timer = null;
        this.timeLeft = 0;
        this.canvasState = [];
    }


    addPlayer(id, name) {
        this.players.push({
            id,
            name,
            score: 0,
            guessed: false
        });
    }

    removePlayer(id) {
        const index = this.players.findIndex(p => p.id === id);
        if (index !== -1) {
            this.players.splice(index, 1);
            if (index < this.drawerIndex) {
                this.drawerIndex--;
            }
        }
        return this.players.length === 0;
    }

    broadcast(event, data) {
        io.to(this.id).emit(event, data);
    }

    broadcastPlayerList() {
        this.broadcast("update_players", {
            players: this.players,
            drawerId: this.getDrawer()?.id,
            state: this.state
        });
    }

    getDrawer() {
        if (this.players.length === 0) return null;
        return this.players[this.drawerIndex % this.players.length];
    }

    nextTurn() {
        this.drawerIndex = (this.drawerIndex + 1) % this.players.length;
        if (this.drawerIndex === 0) {
            this.round++;
        }
    }

    startGame() {
        if (this.players.length < 2) return;
        this.round = 1;
        this.drawerIndex = 0;
        this.canvasState = [];
        this.startChoosingPhase();
    }

    startChoosingPhase() {
        if (this.round > this.maxRounds) {
            this.endGame();
            return;
        }

        this.state = 'CHOOSING';
        this.currentWord = "";
        this.resetGuesses();
        this.canvasState = [];
        this.broadcast("clear");

        const drawer = this.getDrawer();
        const words = getRandomWords(3);

        this.broadcast("state_update", {
            state: 'CHOOSING',
            round: this.round,
            drawerId: drawer.id,
            drawerName: drawer.name,
            timeLeft: GAME_SETTINGS.TIME_CHOOSING
        });

        // FIX: Broadcast player list to update pencil icon immediately
        this.broadcastPlayerList();

        io.to(drawer.id).emit("choose_word", words);

        this.startTimer(GAME_SETTINGS.TIME_CHOOSING, () => {
            if (this.state === 'CHOOSING') {
                this.startDrawingPhase(words[0]);
            }
        });
    }

    startDrawingPhase(word) {
        this.state = 'DRAWING';
        this.currentWord = word;
        this.timeLeft = this.drawingTime;

        const masked = word.split('').map(c => c === ' ' ? ' ' : '_').join('');

        this.broadcast("state_update", {
            state: 'DRAWING',
            wordLength: word.length,
            maskedWord: masked,
            timeLeft: this.timeLeft,
            drawerId: this.getDrawer().id,
            drawerName: this.getDrawer().name
        });

        const drawer = this.getDrawer();
        io.to(drawer.id).emit("your_word", word);

        this.startTimer(this.drawingTime, () => {
            this.endTurn();
        });
    }

    endTurn() {
        this.state = 'INTERMISSION';
        this.broadcast("state_update", {
            state: 'INTERMISSION',
            word: this.currentWord,
            drawerName: this.getDrawer()?.name || "Unknown",
            timeLeft: GAME_SETTINGS.TIME_INTERMISSION
        });

        this.startTimer(GAME_SETTINGS.TIME_INTERMISSION, () => {
            if (this.players.length < 2) {
                this.state = 'LOBBY';
                this.broadcast("state_update", { state: 'LOBBY' });
                return;
            }
            this.nextTurn();
            this.startChoosingPhase();
        });
    }

    endGame() {
        this.state = 'GAME_OVER';
        const sorted = [...this.players].sort((a, b) => b.score - a.score);
        this.broadcast("game_over", sorted);

        setTimeout(() => {
            if (this.players.length > 0) {
                this.state = 'LOBBY';
                this.players.forEach(p => { p.score = 0; p.guessed = false; });
                this.broadcast("reset_lobby");
                this.broadcastPlayerList();
            }
        }, 10000);
    }

    resetGuesses() {
        this.players.forEach(p => p.guessed = false);
    }

    startTimer(seconds, onComplete) {
        if (this.timer) clearInterval(this.timer);
        this.timeLeft = seconds;

        this.timer = setInterval(() => {
            this.timeLeft--;
            io.to(this.id).emit("timer_update", this.timeLeft);

            if (this.timeLeft <= 0) {
                clearInterval(this.timer);
                if (onComplete) onComplete();
            }
        }, 1000);
    }

    handleGuess(playerId, text) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || this.state !== 'DRAWING') return false;

        if (player.id === this.getDrawer().id) return false;
        if (player.guessed) return false;

        const guess = text.trim().toLowerCase();
        const answer = this.currentWord.toLowerCase();

        if (guess === answer) {
            player.guessed = true;
            const score = Math.max(100, Math.ceil((this.timeLeft / this.drawingTime) * 500));
            player.score += score;

            const drawer = this.players.find(p => p.id === this.getDrawer().id);
            if (drawer) drawer.score += 50;

            this.broadcast("player_correct", {
                playerId: player.id,
                name: player.name,
                scoreOffset: score
            });

            this.broadcastPlayerList();

            const guessers = this.players.filter(p => p.id !== this.getDrawer().id);
            if (guessers.every(p => p.guessed)) {
                clearInterval(this.timer);
                this.endTurn();
            }

            return true;
        } else {
            if (this.levenshtein(guess, answer) <= 2 && answer.length > 4) {
                io.to(playerId).emit("close_guess", text);
            }
            return false;
        }
    }

    levenshtein(a, b) {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
        for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) == a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
                }
            }
        }
        return matrix[b.length][a.length];
    }
}

// --- Socket Connection ---

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('create_room', ({ players, username, rounds, drawingTime, isPublic }) => {
        const roomId = generateRoomId();
        // Strict server-side clamping: Max 10 players, Max 10 rounds
        const safePlayers = Math.min(10, Math.max(2, parseInt(players) || 8));
        const safeRounds = Math.min(10, Math.max(1, parseInt(rounds) || 5));

        const room = new GameRoom(roomId, safePlayers, username, socket.id, safeRounds, parseInt(drawingTime) || 60, isPublic);
        rooms[roomId] = room;

        socket.join(roomId);
        socket.emit('room_created', roomId);
        room.broadcastPlayerList();
    });

    socket.on('quick_join', ({ username }) => {
        // Find public room with space
        const availableRoom = Object.values(rooms).find(r => r.isPublic && r.players.length < r.maxPlayers);

        if (availableRoom) {
            joinRoomLogic(socket, availableRoom, username);
        } else {
            socket.emit('error', 'No public rooms available. Create one!');
        }
    });

    socket.on('join_room', ({ code, username }) => {
        const room = rooms[code];
        if (room) {
            joinRoomLogic(socket, room, username);
        } else {
            socket.emit('error', 'Invalid Room Code');
        }
    });

    function joinRoomLogic(socket, room, username) {
        if (room.players.length < room.maxPlayers) {
            const isLateJoin = room.state !== 'LOBBY';

            room.addPlayer(socket.id, username);
            socket.join(room.id);

            socket.emit('joined_room', room.id);
            room.broadcastPlayerList();

            // Auto-start public rooms when 2nd player joins
            if (room.isPublic && room.state === 'LOBBY' && room.players.length === 2) {
                room.startGame();
            }

            if (isLateJoin) {
                console.log(`[DEBUG] Player ${username} joined late. CanvasState size: ${room.canvasState ? room.canvasState.length : 'undefined'}`);
                let masked = "";
                if (room.currentWord) {
                    masked = room.currentWord.split('').map(c => c === ' ' ? ' ' : '_').join('');
                }

                socket.emit("state_update", {
                    state: room.state,
                    round: room.round,
                    drawerId: room.getDrawer()?.id,
                    drawerName: room.getDrawer()?.name,
                    timeLeft: room.timeLeft,
                    maskWords: masked,
                    wordLength: room.currentWord ? room.currentWord.length : 0
                });

                // Send canvas history
                if (room.canvasState && room.canvasState.length > 0) {
                    console.log(`[DEBUG] Sending history to ${username}: ${room.canvasState.length} items`); // DEBUG
                    socket.emit('canvas_history', room.canvasState);
                }
            }
        } else {
            socket.emit('error', 'Room is full');
        }
    }

    socket.on('word_selected', (word) => {
        const room = getRoom(socket);
        if (room && room.getDrawer().id === socket.id && room.state === 'CHOOSING') {
            room.startDrawingPhase(word);
        }
    });

    socket.on('start_game', () => {
        const room = getRoom(socket);
        if (room && room.state === 'LOBBY' && room.players.length >= 2) {
            room.startGame();
        }
    });

    socket.on('draw', (data) => {
        const room = getRoom(socket);
        if (room && room.state === 'DRAWING' && room.getDrawer().id === socket.id) {
            room.canvasState.push({ type: 'draw', ...data });
            console.log(`[DEBUG] Saved draw stroke. Total: ${room.canvasState.length}`); // DEBUG
            socket.to(room.id).emit('draw', data);
        }
    });

    socket.on('clear', () => {
        const room = getRoom(socket);
        if (room && room.state === 'DRAWING' && room.getDrawer().id === socket.id) {
            room.canvasState = [];
            socket.to(room.id).emit('clear');
        }
    });

    socket.on('send_message', (text) => {
        const room = getRoom(socket);
        if (!room) return;

        const isCorrect = room.handleGuess(socket.id, text);

        if (!isCorrect) {
            const player = room.players.find(p => p.id === socket.id);
            io.to(room.id).emit('chat_message', {
                name: player ? player.name : "Unknown",
                text: text,
                type: 'regular'
            });
        }
    });

    socket.on('undo', () => {
        const room = getRoom(socket);
        if (room && room.getDrawer().id === socket.id && room.state === 'DRAWING') {
            if (!room.canvasState || room.canvasState.length === 0) return;

            let removeIndex = -1;
            for (let i = room.canvasState.length - 1; i >= 0; i--) {
                if (room.canvasState[i].type === 'start') {
                    removeIndex = i;
                    break;
                }
            }

            if (removeIndex !== -1) {
                room.canvasState.splice(removeIndex);
                io.to(room.id).emit('clear');
                if (room.canvasState.length > 0) {
                    io.to(room.id).emit('canvas_history', room.canvasState);
                }
            }
        }
    });

    socket.on('undo', () => {
        const room = Object.values(rooms).find(r => r.players.some(p => p.id === socket.id));

        if (room && room.getDrawer().id === socket.id && room.state === 'DRAWING') {
            if (!room.canvasState || room.canvasState.length === 0) return;

            // Find the last 'start' event (beginning of the last stroke)
            let removeIndex = -1;
            for (let i = room.canvasState.length - 1; i >= 0; i--) {
                if (room.canvasState[i].type === 'start') {
                    removeIndex = i;
                    break;
                }
            }

            if (removeIndex !== -1) {
                // Remove from this index to the end
                room.canvasState.splice(removeIndex);

                // Update all clients
                io.to(room.id).emit('clear');
                io.to(room.id).emit('canvas_history', room.canvasState);
            }
        }
    });

    socket.on('disconnect', () => {
        const room = getRoom(socket);
        if (room) {
            const wasDrawer = (room.getDrawer() && room.getDrawer().id === socket.id);
            // Must store state before removing, as removePlayer shifts drawerIndex logic
            const stateBefore = room.state;

            const isEmpty = room.removePlayer(socket.id);

            if (isEmpty) {
                if (room.timer) clearInterval(room.timer);
                delete rooms[room.id];
            } else {
                if (stateBefore !== 'LOBBY') {
                    if (room.players.length < 2) {
                        // Not enough players to continue
                        if (room.timer) clearInterval(room.timer);
                        room.state = 'LOBBY';
                        room.broadcast("state_update", { state: 'LOBBY' });
                    } else if (wasDrawer) {
                        // Current drawer left - IMMEDIATELY end turn to skip to next
                        if (room.timer) clearInterval(room.timer);
                        room.endTurn();
                    }
                }
                room.broadcastPlayerList();
            }
        }
    });

    function getRoom(socket) {
        return Object.values(rooms).find(r => r.players.some(p => p.id === socket.id));
    }
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
