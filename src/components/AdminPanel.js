import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Navigate } from 'react-router-dom';

const GenericAdminPanel = ({ session }) => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [csvFile, setCsvFile] = useState(null);
  const [csvChanges, setCsvChanges] = useState([]);
  const [databaseType, setDatabaseType] = useState('apparel');
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const checkAuthorization = async () => {
      if (!session) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const currentUserUUID = user?.id;

      const adminUUID = process.env.REACT_APP_ADMIN_UUID;
      const additionalAdminUUIDs = process.env.REACT_APP_ADDITIONAL_ADMIN_UUIDS?.split(',') || [];

      if (currentUserUUID === adminUUID || additionalAdminUUIDs.includes(currentUserUUID)) {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }

      setIsLoading(false);
    };

    checkAuthorization();
  }, [session]);

  const getConfig = useCallback(() => {
    const configs = {
      apparel: {
        tableName: 'apparel',
        idField: 'a_id',
        displayName: 'Apparel',
        fieldsToDisplay: ['a_id', 'outfit_name', 'craftable', 'plan_name', 'rarity', 'type'],
      },
      plan: {
        tableName: 'plans',
        idField: 'plan_id',
        displayName: 'Plan',
        fieldsToDisplay: ['plan_id', 'item_type', 'item_name', 'section', 'name', 'location', 'obtainable'],
      },
    };
    return configs[databaseType];
  }, [databaseType]);

  const fetchData = useCallback(async () => {
    const config = getConfig();
    setIsLoading(true);
    setLoadingMessage(`Loading ${config.displayName} Data`);
    setLoadingProgress(0);
    setError(null);

    try {
      let allData = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error, count } = await supabase
          .from(config.tableName)
          .select('*', { count: 'exact' })
          .range(page * pageSize, (page + 1) * pageSize - 1)
          .order(config.idField, { ascending: true });

        if (error) {
          console.error(`Error fetching ${config.displayName.toLowerCase()}:`, error);
          setError(`Error fetching ${config.displayName} data: ${error.message}. This might be a permissions issue.`);
          setIsLoading(false);
          return;
        }

        if (!data || data.length === 0) {
          setError(`No ${config.displayName.toLowerCase()} data found. This might be due to an empty table or insufficient permissions.`);
          setIsLoading(false);
          return;
        }

        allData = [...allData, ...data];
        hasMore = count > (page + 1) * pageSize;
        page++;

        setLoadingProgress(Math.round((allData.length / count) * 100));
      }

      setData(allData);
      setLoadingProgress(100);
    } catch (error) {
      console.error(`Unexpected error while fetching ${config.displayName.toLowerCase()}:`, error);
      setError(`An unexpected error occurred while fetching ${config.displayName} data. Please check the console for more details.`);
    } finally {
      setIsLoading(false);
    }
  }, [getConfig]);

  useEffect(() => {
    if (isAuthorized) {
      fetchData();
    }
  }, [fetchData, isAuthorized]);

  const handleCsvButtonClick = (event) => {
    event.preventDefault();
    fileInputRef.current.click();
  };

  const handleCsvUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setCsvFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(header => header.trim());
        const changes = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          if (values.length === headers.length) {
            const change = {};
            headers.forEach((header, index) => {
              const value = values[index].trim();
              change[header] = value === '' ? null : value;
            });
            changes.push(change);
          }
        }

        const config = getConfig();
        const newAndModifiedItems = changes.filter(change => {
          const existingItem = data.find(item => String(item[config.idField]) === String(change[config.idField]));
          if (!existingItem) {
            return true; // New item
          }
          // Check if any fields are different
          return Object.keys(change).some(key => String(change[key]) !== String(existingItem[key]));
        });

        if (newAndModifiedItems.length === 0) {
          setError("No new or modified items found in the CSV file.");
        } else {
          setCsvChanges(newAndModifiedItems);
        }
      } catch (error) {
        console.error('Error processing CSV file:', error);
        setError(`Error processing CSV file: ${error.message}`);
      }
    };

    reader.onerror = (error) => {
      console.error('Error reading CSV file:', error);
      setError(`Error reading CSV file: ${error.message}`);
    };

    reader.readAsText(file);
  };

  const applyCsvChanges = async () => {
    const config = getConfig();
    setIsLoading(true);
    setLoadingMessage(`Updating ${config.displayName} Database`);
    setLoadingProgress(0);
    setError(null);

    const totalChanges = csvChanges.length;
    let completedChanges = 0;
    let errorOccurred = false;

    for (const item of csvChanges) {
      const existingItem = data.find(dataItem => String(dataItem[config.idField]) === String(item[config.idField]));
      let result;

      if (existingItem) {
        // Update existing item
        result = await supabase
          .from(config.tableName)
          .update(item)
          .eq(config.idField, item[config.idField]);
      } else {
        // Insert new item
        result = await supabase
          .from(config.tableName)
          .insert([item]);
      }

      if (result.error) {
        console.error(`Error updating/adding ${config.displayName.toLowerCase()}:`, result.error);
        setError(`Error updating/adding ${config.displayName}: ${result.error.message}. This might be a permissions issue.`);
        errorOccurred = true;
        break;
      } else {
        completedChanges++;
        setLoadingProgress(Math.round((completedChanges / totalChanges) * 100));
      }
    }

    if (!errorOccurred) {
      setCsvChanges([]);
      setCsvFile(null);
      await fetchData();
    }

    setIsLoading(false);
  };

  if (isLoading && !isAuthorized) {
    return <div>Loading...</div>;
  }

  if (!isAuthorized) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="admin-panel">
      <h2>{getConfig().displayName} Database CSV Update</h2>
      <div className="database-selector">
        <label>
          <input
            type="radio"
            value="apparel"
            checked={databaseType === 'apparel'}
            onChange={() => setDatabaseType('apparel')}
          />
          Apparel Database
        </label>
        <label>
          <input
            type="radio"
            value="plan"
            checked={databaseType === 'plan'}
            onChange={() => setDatabaseType('plan')}
          />
          Plan Database
        </label>
      </div>
      {error && <div className="error-message">{error}</div>}
      <div className={`content-wrapper ${isLoading ? "blurred" : ""}`}>
        <div className="csv-upload">
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept=".csv" 
            onChange={handleCsvUpload} 
          />
          <button onClick={handleCsvButtonClick}>Upload CSV</button>
          {csvFile && (
            <p>Uploaded file: {csvFile.name}</p>
          )}
        </div>
        {csvChanges.length > 0 && (
          <div className="csv-changes-preview">
            <h3>New and Modified Items Preview</h3>
            <table>
              <thead>
                <tr>
                  {getConfig().fieldsToDisplay.map(field => (
                    <th key={field}>{field}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvChanges.map(newItem => (
                  <tr key={newItem[getConfig().idField]}>
                    {getConfig().fieldsToDisplay.map(field => (
                      <td key={field}>
                        {newItem[field] !== null && newItem[field] !== undefined
                          ? String(newItem[field])
                          : 'NULL'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={applyCsvChanges}>Apply Changes</button>
          </div>
        )}
      </div>
      {isLoading && (
        <div className="upload-overlay">
          <div className="upload-message">
            <h3>{loadingMessage}</h3>
            <p>Please wait while we process your request. This may take a few moments.</p>
            <progress value={loadingProgress} max="100"></progress>
            <p>{loadingProgress}% Complete</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenericAdminPanel;