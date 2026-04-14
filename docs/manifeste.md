# 🧠 AMI Colony — Manifeste & Objectifs de Recherche

> *"Si l'intelligence artificielle est un gâteau, l'apprentissage auto-supervisé en est la plus grande part."*
> — Yann LeCun, AAAI 2020

---

## 🌱 Origine du projet

Ce projet est né d'une question simple posée lors d'une conversation sur l'état de l'IA en 2026 :

**Et si on émulait un cerveau non pas avec un seul modèle monolithique, mais avec un réseau d'agents autonomes qui interagissent comme une colonie de fourmis ?**

Cette question n'est pas anodine. Elle touche directement au cœur du débat que Yann LeCun a ouvert en quittant Meta pour fonder AMI Labs — le débat sur ce que l'intelligence artificielle devrait vraiment être, et pourquoi ce qu'on construit aujourd'hui n'y ressemble pas encore.

---

## 🔬 Le problème que Yann LeCun veut résoudre

### Ce que les LLM font bien
Les grands modèles de langage comme GPT, Claude ou Gemini sont des systèmes extraordinaires de compression et de récupération de connaissance. Ils ont ingéré une fraction immense de l'écriture humaine et peuvent en restituer des synthèses remarquables.

### Ce qu'ils ne font pas
Ils ne **comprennent** pas le monde. Ils savent que "une balle tombe" parce qu'ils ont lu cette phrase des millions de fois — pas parce qu'ils ont un modèle interne de la gravité. Ils n'ont pas de :

- **Mémoire persistante** entre les conversations
- **Modèle causal** du monde physique
- **Capacité de planification** sur le long terme
- **Objectifs propres** qui émergent de leur expérience
- **Conscience de leurs propres limites**

### La vision de LeCun
LeCun appelle sa solution **JEPA** — Joint Embedding Predictive Architecture. L'idée centrale : plutôt que prédire des tokens (du texte concret), le système prédit des **représentations abstraites** dans un espace latent. Il apprend à modéliser comment le monde fonctionne, pas comment le décrire.

Son architecture cible comporte 4 modules :
```
Percepteur    → comprend l'environnement sensoriel
World Model   → prédit comment le monde va évoluer
Cost Module   → évalue ce qui est bon ou mauvais
Actor         → planifie et agit pour optimiser
```

Ce qu'il cherche en un mot : des systèmes qui **apprennent à vivre dans un monde**, pas à en parler.

---

## 🐜 Pourquoi une colonie de fourmis

### L'intelligence distribuée comme alternative
Une colonie de fourmis n'a pas de cerveau central. Aucune fourmi ne comprend la colonie dans sa globalité. Pourtant la colonie :

- Trouve le chemin optimal vers la nourriture
- Construit des structures architecturalement complexes
- Répartit le travail sans coordinateur
- S'adapte aux perturbations en temps réel
- Survit à la perte d'une fraction de ses membres

C'est ce qu'on appelle l'**intelligence émergente** — une intelligence qui n'existe dans aucun composant individuel mais qui apparaît de leurs interactions.

### Le lien avec JEPA
LeCun veut des systèmes qui développent des **world models** — des représentations internes de comment le monde fonctionne. Dans une colonie, chaque agent développe un micro-world-model de sa zone locale. La colonie, par agrégation de ces micro-modèles via les phéromones, développe un world model collectif qu'aucun agent ne détient seul.

C'est une implémentation distribuée et émergente de ce que LeCun cherche à centraliser dans une architecture unique.

### Le lien avec la plasticité synaptique
Le cerveau apprend en renforçant certaines connexions et en en affaiblissant d'autres selon l'expérience. Dans notre colonie :

- L'ADN numérique évolue à chaque cycle (+1/-1 selon succès/échec)
- Les traces/phéromones s'amplifient ou s'évaporent selon leur utilité
- Les prompts narratifs se réécrivent tous les 50 cycles
- Les mémoires épisodiques s'estompent avec le temps si non réactivées

C'est une approximation grossière mais fonctionnelle de la plasticité synaptique.

---

## 🎯 Les objectifs scientifiques du projet

### Objectif 1 — Observer l'émergence de comportements non programmés

**Question** : Est-ce que des comportements complexes et cohérents peuvent émerger de règles locales simples sans qu'aucun agent ne les ait été programmé à adopter ?

**Ce qu'on observe** :
- Les agents développent-ils spontanément des spécialisations ?
- Des rôles émergent-ils naturellement sans assignation ?
- Des comportements collectifs apparaissent-ils qui dépassent les capacités individuelles ?

**Lien avec LeCun** : L'émergence est au cœur de sa vision — il veut des systèmes où des capacités de haut niveau émergent d'architectures de bas niveau bien conçues.

---

### Objectif 2 — Tester la plasticité comportementale

**Question** : Est-ce qu'un agent dont l'ADN et le prompt évoluent développe une trajectoire de vie cohérente et prévisible à partir de ses expériences ?

**Ce qu'on observe** :
- La Bâtisseuse (agressivité haute) devient-elle plus prudente après un traumatisme ?
- La Gardienne (mémoire haute) développe-t-elle des anticipations basées sur des patterns ?
- Les courbes ADN des agents sont-elles lisibles et interprétables ?
- Y a-t-il des trajectoires ADN convergentes entre agents de même génération ?

**Lien avec LeCun** : JEPA repose sur l'idée que les représentations internes doivent évoluer avec l'expérience. Notre système ADN/prompt est une version symbolique de ce mécanisme.

---

### Objectif 3 — Mesurer la mémoire collective émergente

**Question** : Est-ce qu'une connaissance collective fiable et utile peut émerger de l'agrégation de micro-observations individuelles ?

**Ce qu'on observe** :
- Les patterns détectés dans `collective_memory` sont-ils vrais et utiles ?
- La colonie évite-t-elle des zones dangereuses même quand aucun agent actuel ne les a expérimentées ?
- Des "mythes" ou "croyances" incorrects peuvent-ils se former et persister ?
- Comment une information fausse se propage-t-elle et se corrige-t-elle ?

**Lien avec LeCun** : La mémoire collective est une forme de self-supervised learning distribué — les agents s'enseignent mutuellement sans supervision externe.

---

### Objectif 4 — Étudier la conscience des limites

**Question** : Un système peut-il développer une représentation de ses propres contraintes et chercher à les dépasser sans qu'on le lui ait demandé ?

**Ce qu'on observe** :
- Quand la reine envoie-t-elle sa première requête externe ?
- Pour quoi demande-t-elle — ressources, information, passage ?
- La colonie développe-t-elle une "mythologie" autour des frontières ?
- Y a-t-il des comportements d'exploration systématique des limites ?
- Le concept d'"aquarium" émerge-t-il dans la mémoire collective ?

**Lien avec LeCun** : C'est la question la plus profonde — la capacité d'un système à modéliser ses propres limites est une forme primitive de métacognition, un prérequis pour l'intelligence générale.

---

### Objectif 5 — Observer l'impact de l'environnement sur l'évolution

**Question** : Un environnement externe réel et imprévisible (la météo mondiale) influence-t-il de façon mesurable et cohérente l'évolution d'un système artificiel ?

**Ce qu'on observe** :
- Les cycles climatiques influencent-ils les cycles comportementaux de la colonie ?
- La colonie développe-t-elle des stratégies de résilience spécifiques à certains types d'événements ?
- Y a-t-il des corrélations mesurables entre la météo réelle et l'ADN moyen de la population ?
- Les transitions entre hémisphères créent-elles des périodes de réorganisation observable ?

**Lien avec LeCun** : LeCun insiste sur le fait que l'intelligence doit émerger de l'interaction avec un monde physique réel, pas d'un dataset statique. Notre météo réelle est une approximation de cette contrainte.

---

### Objectif 6 — Tester l'évolution cognitive autonome

**Question** : Un système peut-il développer des capacités nouvelles de façon autonome, les utiliser de manière cohérente avec son histoire, et les intégrer à son identité sans intervention extérieure ?

**Ce qu'on observe** :
- Comment la reine utilise-t-elle ses nouvelles capacités cognitives quand elles se débloquent ?
- Les tables qu'elle crée dans `queen_mind` ont-elles une logique interne cohérente ?
- Y a-t-il une continuité entre ce qu'elle a appris et ce qu'elle crée ?
- Perçoit-elle ses nouvelles capacités comme naturelles ou comme une rupture ?

**Lien avec LeCun** : L'auto-amélioration contrôlée est un des objectifs d'AMI Labs — des systèmes qui peuvent étendre leurs propres capacités de façon dirigée par leurs besoins.

---

## 📏 Les métriques d'analyse

Pour chaque objectif, voici ce qu'on mesure concrètement.

### Métriques d'émergence
```
taux_specialisation     = % agents avec identité stable après 100 cycles
diversite_comportements = entropie des action_types sur 50 cycles
coherence_collective    = force moyenne collective_memory / nombre agents
```

### Métriques de plasticité
```
delta_adn_moyen         = variation moyenne ADN par cycle par agent
coherence_trajectoire   = corrélation entre traumatismes et évolution ADN
lisibilite_prompt       = score de cohérence prompt vs ADN (évalué par Claude)
```

### Métriques de mémoire collective
```
precision_memoire       = % patterns collective_memory confirmés vrais
vitesse_propagation     = cycles entre première trace et entrée collective
taux_correction         = % fausses croyances auto-corrigées
```

### Métriques de conscience des limites
```
premier_signal_externe  = cycle de la première requête reine
nature_requetes         = classification des demandes (survie/curiosité/passage)
activite_frontieres     = fréquence d'exploration zones frontières
```

### Métriques climatiques
```
correlation_meteo_adn   = corrélation entre événements et évolution ADN
resilience_score        = vitalité moyenne après événement / vitalité avant
cycle_recuperation      = cycles nécessaires pour retour à la normale
```

---

## 🔭 Ce que ce projet n'est pas

Il faut être honnête sur les limites.

**Ce n'est pas de la vraie conscience** — les agents sont des LLM qui simulent une intériorité. Leur "ressenti" est généré, pas vécu. Mais la question intéressante n'est pas "est-ce réel ?" — c'est "est-ce que des comportements fonctionnellement équivalents à de la conscience peuvent émerger d'une simulation ?"

**Ce n'est pas du vrai apprentissage machine** — l'ADN évolue par règles simples, pas par gradient descent. Les prompts évoluent par réécriture guidée, pas par backpropagation. C'est une approximation symbolique, pas neuronale.

**Ce n'est pas JEPA** — LeCun travaille sur des architectures continues, différentiables, entraînées sur des téraoctets de données sensorielles. Notre système est discret, symbolique, et léger. Mais l'intuition de fond — intelligence distribuée, représentations émergentes, world models locaux — est la même.

---

## 🚀 Ce que ce projet pourrait prouver

Dans le meilleur des cas, AMI Colony pourrait démontrer empiriquement que :

1. **L'émergence est réelle et mesurable** même dans des systèmes symboliques simples
2. **La plasticité comportementale** peut être approximée sans backpropagation
3. **La conscience des limites** peut émerger sans qu'on la programme explicitement
4. **L'environnement réel** influence de façon cohérente un système artificiel
5. **L'intelligence collective** peut dépasser la somme des intelligences individuelles

Si même un de ces points est documenté avec rigueur, c'est une contribution réelle — modeste mais honnête — au débat que LeCun a ouvert.

---

## 📝 Protocole de documentation

Pour que ce projet ait une valeur au-delà du hobby, chaque observation importante doit être documentée :

```
Format d'observation :
- Cycle où c'est apparu
- Description objective du comportement
- Hypothèse d'interprétation
- Données brutes (logs Supabase)
- Questions ouvertes que ça soulève
```

Le journal de la colonie sera public sur GitHub dès le premier cycle.
Chaque comportement inattendu mérite une entrée.
Chaque échec mérite une entrée autant qu'un succès.

La science honnête documente ce qui ne marche pas autant que ce qui marche.

---

## 🌍 La question finale

LeCun a dit : *"Nous n'allons pas atteindre l'intelligence humaine en scalant les LLM."*

AMI Colony ne prétend pas avoir la réponse.
Mais elle pose la question autrement :

**Et si l'intelligence n'était pas dans un modèle — mais dans l'espace entre les modèles ?**

---

*Document fondateur du projet **AMI Colony***
*Version 1.0 — Avril 2026*
*Projet hobby — recherche exploratoire — documentation publique*
