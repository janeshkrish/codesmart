public class TestMain {
    public static void main(String[] args) {
        for (int i = 0; i < 5; i++) {
            System.out.println("Iteration " + i);
            try { Thread.sleep(100); } catch (Exception e) {}
        }
    }
}