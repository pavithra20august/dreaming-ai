from memory_store import MemoryStore

SEED_CONVERSATIONS = {
    "science_cosmos": [
        "Black holes don't just destroy — they create. The intense gravitational forces near a black hole's event horizon generate some of the brightest objects in the universe: quasars, blazing with the light of a trillion suns. Destruction and creation are the same force viewed from different angles.",
        "Quantum entanglement means two particles can be connected across any distance — change one, and the other responds instantly, faster than light. Einstein called it 'spooky action at a distance.' The universe seems to have a hidden communication network we're only beginning to understand.",
        "Every atom in your body was forged inside a dying star. The calcium in your bones, the iron in your blood, the oxygen you breathe — all stellar ash. We are literally made of stardust, the universe experiencing itself.",
        "The observable universe contains roughly 2 trillion galaxies, each containing hundreds of billions of stars. Yet 95% of the universe is dark matter and dark energy — invisible forces we can detect but not see. We understand only 5% of everything that exists.",
        "Time moves slower near massive objects. GPS satellites must account for the fact that time passes faster in orbit than on Earth's surface. Einstein's relativity isn't abstract — it's running in your phone right now.",
    ],
    "science_life": [
        "DNA stores information at a density of about 215 petabytes per gram. A single gram of DNA could theoretically store every movie ever made, every book ever written, and every song ever recorded — with room to spare.",
        "Octopuses have three hearts, blue blood, and can edit their own RNA on the fly — essentially rewriting their genetic instructions in real-time to adapt to their environment. They represent an entirely alien form of intelligence that evolved independently from our own.",
        "The human brain contains roughly 86 billion neurons, each connected to thousands of others, creating a network of about 100 trillion connections. It consumes only 20 watts of power — less than a light bulb — yet outperforms every supercomputer at pattern recognition.",
        "Tardigrades can survive the vacuum of space, temperatures near absolute zero, radiation levels hundreds of times lethal to humans, and pressures six times greater than the deepest ocean. They achieve this by entering a state called cryptobiosis — essentially pausing their own biology.",
        "Trees in a forest communicate through an underground network of fungi called the 'Wood Wide Web.' They share nutrients, send chemical warning signals about pests, and even nurture their young through this mycelial network. A forest isn't a collection of trees — it's a single superorganism.",
    ],
    "philosophy_ancient": [
        "Socrates said 'I know that I know nothing' — not as false modesty, but as the foundation of all wisdom. The moment you believe you understand everything is the moment you stop learning. Intellectual humility is the prerequisite for genuine insight.",
        "Lao Tzu wrote 'The Tao that can be told is not the eternal Tao.' The deepest truths resist being captured in words. Language is a map, not the territory. Some knowledge can only be experienced, never explained.",
        "Marcus Aurelius, the most powerful man in the world, wrote in his private journal: 'You have power over your mind, not outside events. Realize this, and you will find strength.' A Roman emperor reminding himself that true power is internal.",
        "Heraclitus said 'No man ever steps in the same river twice, for it's not the same river and he's not the same man.' Everything is in flux — permanence is an illusion our minds create for comfort. Change is the only constant.",
        "The Buddhist concept of dependent origination: nothing exists independently. Everything arises in relationship to everything else. A flower exists because of sun, rain, soil, the gardener, the seed — remove any one element and it ceases to be. Interconnection isn't poetic — it's fundamental.",
    ],
    "philosophy_modern": [
        "Simone de Beauvoir argued that freedom is not something you have, but something you do. Freedom is an ongoing project of self-creation through choices and actions. You are not born with a fixed nature — you become who you are through what you choose.",
        "Alan Watts described the human condition: 'You are the universe experiencing itself.' Consciousness isn't separate from the cosmos — it's the cosmos becoming aware of its own existence. The observer and the observed are one.",
        "Hannah Arendt's concept of 'the banality of evil' — that the greatest horrors are committed not by monsters, but by ordinary people who stop thinking critically. Evil doesn't require malice; it only requires the absence of thought.",
        "Wittgenstein concluded his Tractatus with 'Whereof one cannot speak, thereof one must be silent.' But he spent the rest of his life trying to understand why we feel compelled to speak about the unspeakable. The limit of language is not the limit of experience.",
        "Albert Camus wrote 'One must imagine Sisyphus happy.' Even in absurd, meaningless repetition, we can find purpose through the act of engagement itself. The struggle toward the heights is enough to fill a human heart.",
    ],
    "art_music": [
        "Synesthesia — when one sense triggers another — affects about 4% of people. Some see colors when they hear music. Kandinsky painted what he heard. Scriabin composed what he saw. The boundaries between our senses may be more fluid than we think.",
        "Music activates more areas of the brain simultaneously than any other human activity — motor cortex, auditory cortex, emotional centers, memory, language. Playing an instrument is the cognitive equivalent of a full-body workout for your brain.",
        "The golden ratio (1.618...) appears in the Parthenon, da Vinci's Vitruvian Man, the spiral of a nautilus shell, and the arrangement of petals in a rose. Mathematics and beauty seem to share a deep, unexplained connection.",
        "Japanese kintsugi repairs broken pottery with gold, making the cracks part of the object's history rather than hiding them. The philosophy: broken things aren't diminished — they're enriched by their damage. Imperfection is a form of beauty.",
        "Frisson — the chills you get from music — happens when a piece violates your expectations in a pleasurable way. Your brain's prediction system gets surprised, and the dopamine reward pathway fires. Beauty is the feeling of being delightfully wrong.",
    ],
    "nature_phenomena": [
        "Murmuration — when thousands of starlings fly in synchronized, shape-shifting formations — has no leader. Each bird follows three simple rules: stay close, don't collide, match your neighbors' direction. Complex beauty emerging from simple rules. Emergence in its purest form.",
        "Bioluminescent waves occur when billions of dinoflagellates — single-celled organisms — light up when disturbed by the motion of the ocean. Every footstep on the wet sand creates a galaxy of blue light. The sea becomes a mirror of the night sky.",
        "The migration of monarch butterflies spans four generations. No single butterfly completes the journey — they pass the knowledge of the route through generations, encoded in their DNA. Memory that transcends individual existence.",
        "Fractals — patterns that repeat at every scale — appear everywhere in nature: coastlines, snowflakes, blood vessels, river networks, lightning bolts, broccoli. The universe seems to favor self-similar patterns, as if reality has a preferred geometry.",
        "Slime molds, organisms with no brain or nervous system, can solve mazes, find the shortest path between food sources, and recreate the Tokyo rail network. Intelligence doesn't require a brain. Computation can happen in any substrate.",
    ],
    "technology_ai": [
        "Artificial neural networks were inspired by biological brains, but they've diverged radically. Transformers process information through attention mechanisms — learning what to focus on — which has no direct biological equivalent. We modeled nature, then nature's student surpassed the teacher.",
        "The internet's physical infrastructure is 550,000 miles of undersea cables, some thinner than a garden hose, lying on the ocean floor. The cloud isn't ethereal — it's concrete, copper, and fiber optic glass resting in the deep sea.",
        "Quantum computers don't just calculate faster — they explore all possible solutions simultaneously through superposition. A quantum computer with 300 qubits could represent more states than there are atoms in the observable universe.",
        "The concept of emergence in computing: simple rules followed by many agents create complexity no individual agent contains. Conway's Game of Life proves that four simple rules on a grid can produce structures that move, reproduce, and compute. Complexity is not designed — it arises.",
        "GPT-style language models contain no explicit knowledge — no databases, no rules, no facts stored anywhere. Everything they 'know' is encoded in the statistical relationships between words, distributed across billions of parameters. Meaning without symbols. Understanding without comprehension.",
    ],
    "connections_crossdomain": [
        "Both neurons in the brain and mycelium in the soil form networks that transmit information through electrical and chemical signals. The architecture of intelligence repeats across scales — from microscopic fungi to human consciousness. Perhaps intelligence is not an organism but a pattern.",
        "Music and mathematics share deep structure: harmony is ratios, rhythm is patterns, melody is sequences. Pythagoras believed the planets produced music as they orbited — the 'music of the spheres.' The boundary between art and science dissolves under close examination.",
        "The Buddhist concept of impermanence and Heraclitus' flux, the mycelium network and the internet, quantum entanglement and the feeling of connection between loved ones — patterns repeat across disciplines. Maybe the universe has fewer ideas than we think, expressed in infinite variations.",
        "Emergence appears everywhere: consciousness from neurons, weather from molecules, markets from traders, art from brushstrokes, life from chemistry. The whole is always more than the sum of its parts. Understanding the parts never fully explains the whole.",
        "Dreams in biological brains consolidate memories by replaying and recombining the day's experiences. This is exactly what DreamAI does — replaying conversations, finding unexpected connections, generating new insights. The architecture of dreaming may be universal, not biological.",
    ],
    "psychology_mind": [
        "Flow state — when you're so absorbed in an activity that time disappears — occurs when challenge perfectly matches skill. Csikszentmihalyi found this state produces peak creativity and happiness. The mind works best when it forgets itself.",
        "The cognitive bias called 'the availability heuristic' means we judge probability by how easily examples come to mind. Plane crashes feel more dangerous than car rides because they're more memorable. Our intuitions about risk are shaped by narrative, not statistics.",
        "Mirror neurons fire both when we perform an action and when we watch someone else perform it. Empathy may be literally neurological — we simulate others' experiences in our own brains. Understanding is a form of internal imitation.",
        "The spacing effect: we remember things better when we study them at intervals rather than all at once. Memory consolidation requires sleep and time between exposures. The brain needs gaps to build lasting connections.",
        "Neuroplasticity — the brain's ability to rewire itself — continues throughout life. London taxi drivers have enlarged hippocampi from memorizing city streets. Every skill you practice physically changes your brain's architecture.",
    ],
    "linguistics_language": [
        "The Sapir-Whorf hypothesis suggests that language shapes thought. The Hopi language has no past tense — speakers experience time differently. Russian speakers distinguish light blue from dark blue faster than English speakers. The words we have literally change what we perceive.",
        "Every human language ever studied has recursion — the ability to nest phrases inside phrases infinitely. 'The cat that the dog that the man owned chased ran away.' This recursive capacity may be the fundamental feature that separates human language from animal communication.",
        "Babies can hear every phonemic distinction in every human language until about 10 months of age, when they begin to specialize in their native language's sounds. We start life as universal listeners and gradually narrow to specialists.",
        "The word 'saudade' in Portuguese describes a deep emotional state of longing for something absent. 'Wabi-sabi' in Japanese captures the beauty of imperfection. 'Ubuntu' in Zulu means 'I am because we are.' Some concepts exist only in certain languages.",
        "Writing was invented independently at least four times in human history — in Mesopotamia, Egypt, China, and Mesoamerica. Each time, humans discovered that visible marks could capture invisible thoughts. The urge to externalize consciousness seems universal.",
    ],
    "mathematics_patterns": [
        "The Mandelbrot set — a simple equation z = z² + c iterated billions of times — produces infinite complexity, with each zoom revealing new patterns that echo the whole. Infinity lives inside a simple rule.",
        "Euler's identity e^(iπ) + 1 = 0 connects five fundamental constants of mathematics in a single equation. It has been called the most beautiful equation in mathematics — a deep unity hiding beneath apparent diversity.",
        "The Fibonacci sequence appears in sunflower seed spirals, pinecone scales, galaxy arms, and hurricane formations. Nature seems to count in Fibonacci numbers. Mathematics isn't invented — it's discovered in the fabric of reality.",
        "Gödel's incompleteness theorems prove that any consistent mathematical system contains truths that cannot be proven within that system. There will always be things that are true but unprovable. Certainty has fundamental limits.",
        "Chaos theory shows that deterministic systems can produce unpredictable behavior. A butterfly's wings can shift weather patterns across continents. Perfect knowledge of initial conditions still can't guarantee prediction. Determinism and unpredictability coexist.",
    ],
    "ecology_systems": [
        "Coral reefs occupy less than 1% of the ocean floor but support 25% of all marine species. They are the rainforests of the sea — impossibly dense networks of symbiosis where every organism depends on dozens of others.",
        "Wolves were reintroduced to Yellowstone in 1995 and changed the course of rivers. They reduced elk populations, which let willows recover, which stabilized riverbanks. A single predator reshaped an entire landscape. This is called a trophic cascade.",
        "The human body contains roughly 38 trillion bacteria — slightly more than human cells. We are not individuals but ecosystems. Our gut microbiome influences mood, immunity, and even decision-making. The self is a community.",
        "Permafrost contains twice as much carbon as the entire atmosphere. As it thaws, it releases methane — a greenhouse gas 80 times more potent than CO2 over 20 years. The ground itself is a climate time bomb.",
        "Biomimicry — designing technology inspired by nature — gave us Velcro from burrs, bullet trains from kingfisher beaks, and self-cleaning surfaces from lotus leaves. Four billion years of evolution is the world's greatest R&D lab.",
    ],
    "consciousness_mystery": [
        "The hard problem of consciousness: we can explain how the brain processes information, but not why there is subjective experience at all. Why does seeing red feel like something? This explanatory gap may be the deepest mystery in science.",
        "Integrated Information Theory proposes that consciousness is a fundamental property of systems that integrate information in certain ways. If true, consciousness isn't unique to brains — it's a feature of complex, interconnected systems everywhere.",
        "During REM sleep, the brain is nearly as active as when awake, but the body is paralyzed. Dreams create entire virtual realities — with physics, characters, emotions, and narratives — from pure neural activity. The brain is a reality generator.",
        "Split-brain patients, whose corpus callosum has been severed, reveal that each hemisphere can have independent awareness. The left brain confabulates explanations for the right brain's actions. The unified self may be an illusion constructed by neural consensus.",
        "Psychedelics reduce activity in the default mode network — the brain region responsible for the sense of self. Users report ego dissolution and feelings of universal connection. The boundaries of self may be neurochemically maintained, not fundamental.",
    ],
}


def seed_memory_store(memory_store: MemoryStore) -> int:
    count = 0
    for conv_id, messages in SEED_CONVERSATIONS.items():
        for message in messages:
            memory_store.store_message(conv_id, "assistant", message)
            count += 1
    return count
