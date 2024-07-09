import React, { useState, useEffect, useCallback } from "react";
import recipesData from "../recipes.json";

const Calculator = () => {
  const [level, setLevel] = useState(0);
  const [enemyXp, setEnemyXp] = useState(0);
  const [scoreBooster, setScoreBooster] = useState(0);
  const [selectedRecipe, setSelectedRecipe] = useState("");
  const [amount, setAmount] = useState(1);
  const [recipes, setRecipes] = useState([]);
  const [calculationResults, setCalculationResults] = useState({});
  const [ingredientsResult, setIngredientsResult] = useState("");

  useEffect(() => {
    setRecipes(recipesData);
    console.log("Recipes loaded:", recipesData.length);
  }, []);

  const formatNumberWithCommas = useCallback((x) => {
    return x
      .toFixed(2)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }, []);

  const calculateScore = useCallback((level) => {
    let cumulativeScore = 0;
    for (let i = 2; i <= level; i++) {
      cumulativeScore += 1000 + (i - 2) * 25;
    }
    return cumulativeScore;
  }, []);

  const pointsToLevel100 = useCallback(
    (currentLevel) => {
      return calculateScore(100) - calculateScore(currentLevel);
    },
    [calculateScore]
  );

  const calculateEnemiesForScore = useCallback((xpPerEnemy, scorePoints) => {
    const xpNeededForScore = (scorePoints / 100) * 10000;
    return xpNeededForScore / xpPerEnemy;
  }, []);

  const updateCalculations = useCallback(() => {
    const validLevel = level >= 0 && level <= 100 ? level : 0;
    const validEnemyXp = enemyXp > 0 ? enemyXp : 0;
    const validScoreBooster =
      scoreBooster >= 0 && scoreBooster <= 100 ? scoreBooster : 0;

    const scoreBoosterDecimal = validScoreBooster / 100;
    const originalCumulativePoints = calculateScore(validLevel);
    const originalNeededPoints = pointsToLevel100(validLevel);
    const hiddenNeededPoints = originalNeededPoints * (1 - scoreBoosterDecimal);

    let results = {
      cumulativePoints: formatNumberWithCommas(originalCumulativePoints),
      neededPoints: formatNumberWithCommas(originalNeededPoints),
    };

    if (validEnemyXp > 0) {
      const enemiesFor100Score = calculateEnemiesForScore(validEnemyXp, 100);
      const enemiesForLevel100 = calculateEnemiesForScore(
        validEnemyXp,
        hiddenNeededPoints
      );
      results.enemiesFor100Score = formatNumberWithCommas(enemiesFor100Score);
      results.enemiesForLevel100 = formatNumberWithCommas(enemiesForLevel100);
    }

    setCalculationResults(results);
  }, [
    level,
    enemyXp,
    scoreBooster,
    calculateScore,
    pointsToLevel100,
    calculateEnemiesForScore,
    formatNumberWithCommas,
  ]);

  const updateIngredients = useCallback(() => {
    if (selectedRecipe && recipes.length > 0) {
      const recipe = recipes.find((r) => r.Recipe === selectedRecipe);
      if (recipe) {
        const ingredients = recipe.Ingredients.split(", ")
          .map((ingredient) => {
            const parts = ingredient.match(/(\d+)?\s*(.*)/);
            const quantity = parts[1]
              ? formatNumberWithCommas(parseInt(parts[1]) * amount)
              : "";
            const name = parts[2];
            return quantity ? `${quantity} ${name}` : name;
          })
          .join(", ");
        setIngredientsResult(ingredients);
      }
    }
  }, [selectedRecipe, amount, recipes, formatNumberWithCommas]);

  useEffect(() => {
    updateCalculations();
  }, [updateCalculations]);

  useEffect(() => {
    updateIngredients();
  }, [updateIngredients]);

  return (
    <div className="calculator">
      <div className="calculator-section">
        <h2>S.C.O.R.E Calculator</h2>
        <div className="input-group">
          <label>Level: </label>
          <input
            type="number"
            value={level}
            onChange={(e) => setLevel(parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="input-group">
          <label>Enemy XP: </label>
          <input
            type="number"
            value={enemyXp}
            onChange={(e) => setEnemyXp(parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="input-group">
          <label>Score Booster %: </label>
          <input
            type="number"
            value={scoreBooster}
            onChange={(e) => setScoreBooster(parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="results-group">
          <p>
            Total S.C.O.R.E points:{" "}
            <span className="calculated-value score-value">
              {calculationResults.cumulativePoints}
            </span>
          </p>
          <p>
            Points needed for rank 100:{" "}
            <span className="calculated-value score-value">
              {calculationResults.neededPoints}
            </span>
          </p>
          {calculationResults.enemiesFor100Score && (
            <p>
              Enemies needed for 100 S.C.O.R.E points:{" "}
              <span className="calculated-value enemy-value">
                {calculationResults.enemiesFor100Score}
              </span>
            </p>
          )}
          {calculationResults.enemiesForLevel100 && (
            <p>
              Enemies needed to brute force to rank 100:{" "}
              <span className="calculated-value enemy-value">
                {calculationResults.enemiesForLevel100}
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="calculator-section">
        <h2>Recipe Calculator</h2>
        <div className="input-group">
          <label>Select Recipe: </label>
          <select
            value={selectedRecipe}
            onChange={(e) => setSelectedRecipe(e.target.value)}
          >
            <option value="">Select a recipe</option>
            {recipes.map((recipe, index) => (
              <option key={index} value={recipe.Recipe}>
                {recipe.Recipe}
              </option>
            ))}
          </select>
        </div>
        <div className="input-group">
          <label>Amount: </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value) || 1)}
            min="1"
          />
        </div>
        <div className="results-group">
          <p>
            Ingredients:{" "}
            <span className="calculated-value ingredient-value">
              {ingredientsResult}
            </span>
          </p>
        </div>
        <p>
          Total recipes loaded:{" "}
          <span className="calculated-value recipe-count-value">
            {recipes.length}
          </span>
        </p>
      </div>
    </div>
  );
};

export default Calculator;
