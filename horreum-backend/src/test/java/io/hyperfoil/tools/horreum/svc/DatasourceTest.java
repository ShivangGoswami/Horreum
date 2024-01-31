package io.hyperfoil.tools.horreum.svc;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.hyperfoil.tools.horreum.api.data.*;
import io.hyperfoil.tools.horreum.api.data.Test;
import io.hyperfoil.tools.horreum.api.data.datastore.Datastore;
import io.hyperfoil.tools.horreum.api.data.datastore.DatastoreType;
import io.hyperfoil.tools.horreum.api.data.datastore.ElasticsearchDatastoreConfig;
import io.hyperfoil.tools.horreum.api.services.ConfigService;
import io.hyperfoil.tools.horreum.bus.MessageBusChannels;
import io.hyperfoil.tools.horreum.entity.backend.DatastoreConfigDAO;
import io.hyperfoil.tools.horreum.entity.data.DatasetDAO;
import io.hyperfoil.tools.horreum.test.HorreumTestProfile;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.TestProfile;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.elasticsearch.client.Request;
import org.elasticsearch.client.Response;
import org.elasticsearch.client.RestClient;
import org.junit.Assert;
import org.junit.jupiter.api.*;

import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.junit.Assert.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@QuarkusTest
@TestProfile(HorreumTestProfile.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class DatasourceTest extends BaseServiceTest{

    @ConfigProperty(name = "quarkus.elasticsearch.hosts")
    Optional<List<String>> hosts;
    @ConfigProperty(name = "quarkus.elasticsearch.protocol")
    Optional<String> protocol;
    @ConfigProperty(name = "quarkus.elasticsearch.apiKey")
    Optional<String> apiKey;

    @Inject
    ObjectMapper mapper;

    @Inject
    RestClient elasticRestClient;

    @Inject
    ConfigService configService;


    @org.junit.jupiter.api.Test
    public void testRetrieveDataFromElastic(TestInfo info) throws InterruptedException {

        TestConfig testConfig = createNewTestAndDatastores(info);

        BlockingQueue<Dataset.EventNew> dataSetQueue = eventConsumerQueue(Dataset.EventNew.class, MessageBusChannels.DATASET_NEW, e -> e.testId == testConfig.test.id);

        String payload = """
                { 
                    "index": "tfb",
                    "type": "DOC",
                    "query": "{docID}"
                 }
                """.replace("{docID}", "1047");

        String runID = uploadRun(payload, testConfig.test.name, testConfig.schema.uri);

        assertNotNull(runID);
        Assert.assertTrue(Integer.parseInt(runID) > 0);

        Dataset.EventNew event = dataSetQueue.poll(10, TimeUnit.SECONDS);
        Assertions.assertNotNull(event);

        DatasetDAO ds = DatasetDAO.findById(event.datasetId);
        assertTrue(ds.data.isArray());
        assertEquals(1, ds.data.size());
        assertEquals(1047, ds.data.path(0).path("value").intValue());

    }
    @org.junit.jupiter.api.Test
    public void multidocPayload(TestInfo info) throws InterruptedException {
        TestConfig testConfig = createNewTestAndDatastores(info);

        BlockingQueue<Dataset.EventNew> dataSetQueue = eventConsumerQueue(Dataset.EventNew.class, MessageBusChannels.DATASET_NEW, e -> e.testId == testConfig.test.id);

        String payload = """
                { 
                    "index": "tfb",
                    "type": "SEARCH",
                    "query": {
                          "query": {
                              "bool" : {
                                "must" : [
                                  { "term" : {  "job": "dummy" } }
                                ],
                                "boost" : 1.0
                              }
                          }
                    }
                 }
                """;

        String runID = uploadRun(payload, testConfig.test.name, testConfig.schema.uri);

        assertNotNull(runID);
//        Assert.assertNotEquals(runID, "");

    }


    @org.junit.jupiter.api.Test
    public void testDeleteDatasource(TestInfo info) throws InterruptedException {
        TestConfig testConfig = createNewTestAndDatastores(info);
        DatastoreConfigDAO newDatastore = DatastoreConfigDAO.findById(testConfig.datastore.id);
        assertNotNull(newDatastore);

        jsonRequest().delete("/api/config/datastore/".concat(testConfig.datastore.id.toString()))
                .then().statusCode(204);

    }

    @org.junit.jupiter.api.Test
    public void testDatastorePermissions(TestInfo info) throws InterruptedException {

        DatastoreConfigDAO.<DatastoreConfigDAO>list("owner = ?1 and type = ?2", TESTER_ROLES[0], DatastoreType.ELASTICSEARCH)
                .stream()
                .forEach(store -> jsonRequest().delete("/api/config/datastore/".concat(store.id.toString())));

        TestConfig testConfig = createNewTestAndDatastores(info);
        DatastoreConfigDAO newDatastore = DatastoreConfigDAO.findById(testConfig.datastore.id);
        assertNotNull(newDatastore);

        List<Object> datastores = unauthenticatedJsonRequest().get("/api/config/datastore/".concat(TESTER_ROLES[0]))
                .then().statusCode(200).extract().body().as(List.class);

        assertNotNull(datastores);
        assertSame(1, datastores.size());

        datastores = jsonRequest().get("/api/config/datastore/".concat(TESTER_ROLES[0]))
                .then().statusCode(200).extract().body().as(List.class);

        assertNotNull(datastores);
        assertSame(2, datastores.size());

    }

    private TestConfig createNewTestAndDatastores(TestInfo info){
        Datastore newDatastore = new Datastore();
        newDatastore.name = info.getDisplayName();
        newDatastore.type = DatastoreType.ELASTICSEARCH;
        newDatastore.builtIn = false;
        newDatastore.access = Access.PRIVATE;
        newDatastore.owner = TESTER_ROLES[0];

        ElasticsearchDatastoreConfig elasticConfig = new ElasticsearchDatastoreConfig();
        elasticConfig.url = hosts.get().get(0);
        elasticConfig.apiKey = apiKey.orElse("");

        newDatastore.config = mapper.valueToTree(elasticConfig);

        JsonNode datasourceTree = mapper.valueToTree(newDatastore);

        newDatastore.id = jsonRequest().body(datasourceTree.toString()).post("/api/config/datastore")
                .then().statusCode(200).extract().as(Integer.class);

        Test exampleTest = createExampleTest(getTestName(info), newDatastore.id);

        Test test = createTest(exampleTest);

        Extractor path = new Extractor("value", "$.\"build-id\"", false);
        Schema schema = createExampleSchema(info);

        Transformer transformer = createTransformer("acme", schema, "", path);
        addTransformer(test, transformer);
        return new TestConfig(test, schema, newDatastore);
    }

    class TestConfig{
        public final Test test;
        public final Schema schema;
        public final Datastore datastore;

        public TestConfig(Test test, Schema schema, Datastore datastore) {
            this.test = test;
            this.schema = schema;
            this.datastore = datastore;
        }
    }

    @BeforeAll
    public void configureElasticDatasets(){

        uploadDoc("data/experiment-ds1.json");
        uploadDoc("data/experiment-ds2.json");
        uploadDoc("data/experiment-ds3.json");
        uploadDoc("data/config-quickstart.jvm.json");

    }

    private void uploadDoc(String resourcepath){
        try {
            JsonNode payload = new ObjectMapper().readTree(resourceToString(resourcepath));
            Request request = new Request(
                    "PUT",
                    "/tfb/_doc/" + payload.get("build-id").toString());
            request.setJsonEntity(payload.toString());
            Response response = elasticRestClient.performRequest(request);
            assertNotNull(response);
            String header = response.getHeader("Location");
            assertNotNull(header);
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

}
